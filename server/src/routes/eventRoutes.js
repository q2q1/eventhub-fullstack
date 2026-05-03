const express = require('express');
const protect = require('../middleware/auth');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');

const router = express.Router();

function getIO(req) {
  return req.app.get('io');
}

router.get('/', async (req, res, next) => {
  try {
    const events = await Event.find()
      .populate('creator', 'name email')
      .sort({ eventDate: 1 });

    return res.json(events);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id).populate('creator', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    return res.json(event);
  } catch (error) {
    return next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const event = await Event.create({
      ...req.body,
      creator: req.user._id,
    });

    const populatedEvent = await event.populate('creator', 'name email');
    getIO(req).emit('event:created', populatedEvent);

    return res.status(201).json(populatedEvent);
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the creator can update this event' });
    }

    const allowedFields = ['title', 'description', 'location', 'category', 'eventDate', 'capacity'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        event[field] = req.body[field];
      }
    });

    await event.save();
    const populatedEvent = await event.populate('creator', 'name email');
    getIO(req).emit('event:updated', populatedEvent);

    return res.json(populatedEvent);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (!event.creator.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the creator can delete this event' });
    }

    await RSVP.deleteMany({ event: event._id });
    await event.deleteOne();
    getIO(req).emit('event:deleted', { id: event._id });

    return res.json({ message: 'Event deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
