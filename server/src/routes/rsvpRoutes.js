const express = require('express');
const protect = require('../middleware/auth');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');

const router = express.Router();

function getIO(req) {
  return req.app.get('io');
}

async function populateRSVP(query) {
  return query.populate('user', 'name email').populate('event', 'title eventDate location');
}

router.get('/', async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) {
      filter.event = req.query.event;
    }

    const rsvps = await populateRSVP(RSVP.find(filter).sort({ updatedAt: -1 }));
    return res.json(rsvps);
  } catch (error) {
    return next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const rsvp = await populateRSVP(RSVP.findById(req.params.id));

    if (!rsvp) {
      return res.status(404).json({ message: 'RSVP not found' });
    }

    return res.json(rsvp);
  } catch (error) {
    return next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const { event, status, note } = req.body;

    const existingEvent = await Event.findById(event);
    if (!existingEvent) {
      return res.status(404).json({ message: 'Event not found' });
    }

    const rsvp = await RSVP.create({
      event,
      status,
      note,
      user: req.user._id,
    });

    const populated = await populateRSVP(RSVP.findById(rsvp._id));
    getIO(req).emit('rsvp:created', populated);
    getIO(req).to(String(event)).emit('rsvp:updated', populated);

    return res.status(201).json(populated);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'You already RSVPd to this event' });
    }

    return next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const rsvp = await RSVP.findById(req.params.id);

    if (!rsvp) {
      return res.status(404).json({ message: 'RSVP not found' });
    }

    if (!rsvp.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the RSVP owner can update it' });
    }

    if (req.body.status !== undefined) {
      rsvp.status = req.body.status;
    }
    if (req.body.note !== undefined) {
      rsvp.note = req.body.note;
    }

    await rsvp.save();
    const populated = await populateRSVP(RSVP.findById(rsvp._id));
    getIO(req).emit('rsvp:updated', populated);
    getIO(req).to(String(rsvp.event)).emit('rsvp:updated', populated);

    return res.json(populated);
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const rsvp = await RSVP.findById(req.params.id);

    if (!rsvp) {
      return res.status(404).json({ message: 'RSVP not found' });
    }

    if (!rsvp.user.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the RSVP owner can delete it' });
    }

    await rsvp.deleteOne();
    getIO(req).emit('rsvp:deleted', { id: rsvp._id, event: rsvp.event });
    getIO(req).to(String(rsvp.event)).emit('rsvp:deleted', { id: rsvp._id, event: rsvp.event });

    return res.json({ message: 'RSVP deleted' });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
