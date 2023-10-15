require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const session = require("express-session");
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp');

const app = express();
app.use(express.json());
app.use(express.static('public'));

app.use(
  session({
    secret: "notifyEvent",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.use(
  cors({
    origin: "https://event-hub-kah1.vercel.app",
    methods: "GET,POST,PUT,DELETE",
    credentials: true,
  })
);




mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Error connecting to MongoDB:', error));

const eventSchema = new mongoose.Schema({
  eventTitle: { type: String, required: true },
  eventDescription: { type: String, required: true },
  eventCategory: { type: String, required: true },
  eventVenue: { type: String, required: true },
  eventDate: { type: Date, required: true },
  eventStartTime: { type: String, required: true },
  eventEndTime: { type: String, required: true },
  estimatedTime: { type: String, required: true },
  agenda: { type: String, required: true },
  eventRegistrationLink: { type: String, required: false },
  isPaidEvent: { type: Boolean, required: true },
  isOnlineEvent: { type: Boolean, required: true },
  organizerName: { type: String, required: true },
  posterImage: { type: Buffer, required: false },
  hasSeatBooking: { type: Boolean, required: true },
  seatLimit: { type: Number, required: false, default: 0 },
  provideRegistrationLink: { type: Boolean, required: true },
  candidateLimit: { type: Number, required: false, default: 0 },
  userEmail: { type: String, required: true }
});

const Event = mongoose.model('Event', eventSchema);

const secondStorage = multer.memoryStorage();
const EventUpload = multer({ storage: secondStorage });

app.post('/eventUpload', EventUpload.single('posterImage'), async (req, res) => {
  try {
    const {
      eventTitle,
      eventDescription,
      eventCategory,
      eventVenue,
      eventDate,
      eventStartTime,
      eventEndTime,
      estimatedTime,
      agenda,
      eventRegistrationLink,
      isPaidEvent,
      isOnlineEvent,
      organizerName,
      hasSeatBooking,
      seatLimit,
      provideRegistrationLink,
      candidateLimit,
      userEmail,
    } = req.body;
    var posterImage = req.file.buffer;

    posterImage = await sharp(posterImage)
      .resize({ width: 800 })
      .jpeg({ quality: 80 })
      .toBuffer();

    const newEvent = new Event({
      eventTitle,
      eventDescription,
      eventCategory,
      eventVenue,
      eventDate,
      eventStartTime,
      eventEndTime,
      estimatedTime,
      agenda,
      eventRegistrationLink,
      isPaidEvent,
      isOnlineEvent,
      organizerName,
      posterImage,
      hasSeatBooking,
      seatLimit: hasSeatBooking ? seatLimit : 0,
      provideRegistrationLink,
      candidateLimit: provideRegistrationLink ? candidateLimit : 0,
      userEmail: userEmail,
    });

    await newEvent.save();

    res.status(200).json({ message: 'Event submitted successfully!' });
  } catch (error) {
    console.error('Error submitting event:', error);
    res.status(500).json({ error: 'Error submitting event. Please try again later.' });
  }
});

app.get('/getEvents', async (req, res) => {
  try {
    const events = await Event.find();
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events. Please try again later.' });
  }
});

app.get('/getEvents/:eventId', async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const event = await Event.findById(eventId);
    res.json(event);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Error fetching events. Please try again later.' });
  }
});

const reservationSchema = new mongoose.Schema({
  eventId: { type: String, required: true },
  userEmail: { type: String, required: true },
  registered: { type: Boolean, required: true },
  eventDate: { type: Date, required: true },
  eventStartTime: { type: String, required: true },
  eventEndTime: { type: String, required: true },
  seatCount: { type: Number, default: 0 },
});

const Reservation = mongoose.model('Reservation', reservationSchema);

app.post('/reserveSeat', async (req, res) => {
  try {
    const { eventId, userEmail, registered, eventDate, eventStartTime, eventEndTime, seatCount } = req.body;

    const reservation = new Reservation({
      eventId,
      userEmail,
      registered,
      eventDate,
      eventStartTime,
      eventEndTime,
      seatCount,
    });

    await reservation.save();

    res.status(200).json({ message: 'Seat(s) reserved successfully!' });
  } catch (error) {
    console.error('Error reserving seat:', error);
    res.status(500).json({ message: 'Error reserving seat. Please try again later.' });
  }
});

app.post('/registerEvent', async (req, res) => {
  try {
    const { eventId, userEmail, registered, eventDate, eventStartTime, eventEndTime, seatCount } = req.body;

    const reservation = new Reservation({
      eventId,
      userEmail,
      registered,
      eventDate,
      eventStartTime,
      eventEndTime,
      seatCount,
    });

    await reservation.save();

    res.status(200).json({ message: 'Event registration successful!' });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ message: 'Error registering for event. Please try again later.' });
  }
});

app.get('/registeredEvents', async (req, res) => {
  try {
    const userEmail = req.query.userEmail;

    const registeredEvents = await Reservation.find({ userEmail, registered: true });
    const eventIds = registeredEvents.map((event) => event.eventId);
    const events = await Event.find({ _id: { $in: eventIds } });

    const registeredEventDetails = events.map((event) => {
      return {
        eventName: event.eventTitle,
        eventDate: event.eventDate,
        eventStartTime: event.eventStartTime,
        eventEndTime: event.eventEndTime,
      };
    });

    res.status(200).json(registeredEventDetails);
  } catch (error) {
    console.error('Error fetching registered events:', error);
    res.status(500).json({ message: 'Error fetching registered events. Please try again later.' });
  }
});

app.get('/organizedEvents/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const organizedEvents = await Event.find({ userEmail: email });

    res.status(200).json(organizedEvents);
  } catch (error) {
    console.error('Error fetching organized events:', error);
    res.status(500).json({ message: 'Error fetching organized events. Please try again later.' });
  }
});



app.get('/otherUsersRegisteredEvents/:email', async (req, res) => {
  try {
    const currentUserEmail = req.params.email;

    // Fetch reservations for all other users except the current user
    const otherUserReservations = await Reservation.find({ userEmail: { $ne: currentUserEmail } });

    // Fetch all eventIds for the reservations
    const eventIds = otherUserReservations.map((reservation) => reservation.eventId);

    // Fetch the details of the registered events from the events table
    const events = await Event.find({ _id: { $in: eventIds }, userEmail: currentUserEmail });

    // Create a map of events for quick access
    const eventMap = events.reduce((map, event) => {
      map[event._id.toString()] = event;
      return map;
    }, {});

    // Map combined event and reservation details to the desired format
    const registeredEventDetails = otherUserReservations.map((reservation) => {
      const event = eventMap[reservation.eventId.toString()];

      if (!event) {
        // Event not found in the eventMap, handle this error condition
        return {
          error: 'Event not found',
          reservationId: reservation._id,
        };
      }

      return {
        eventName: event.eventTitle,
        eventDate: event.eventDate,
        eventStartTime: event.eventStartTime,
        eventEndTime: event.eventEndTime,
        userEmail: reservation.userEmail,
        seatsBooked: reservation.seatCount, // Assuming 'seatCount' field holds the number of seats booked
        registered: reservation.registered,
        remove: reservation.remove,
        // Add any other reservation table fields you want to include here
      };
    });

    res.status(200).json(registeredEventDetails);
  } catch (error) {
    console.error('Error fetching other users registered for events:', error);
    res.status(500).json({ message: 'Error fetching other users registered for events. Please try again later.' });
  }
});



app.post('/updateEvent/:eventId', EventUpload.single('posterImage'), async (req, res) => {
  try {
    const {
      eventTitle,
      eventDescription,
      eventCategory,
      eventVenue,
      eventDate,
      eventStartTime,
      eventEndTime,
      estimatedTime,
      agenda,
      eventRegistrationLink,
      isPaidEvent,
      isOnlineEvent,
      organizerName,
      hasSeatBooking,
      seatLimit,
      provideRegistrationLink,
      candidateLimit,
      userEmail,
    } = req.body;

    // Get the event ID from the URL params
    const eventId = req.params.eventId;
    
    // Check if the event exists
    const existingEvent = await Event.findById(eventId);
    if (!existingEvent) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    
    // Prepare the updated event object
    const updatedEvent = {
      eventTitle,
      eventDescription,
      eventCategory,
      eventVenue,
      eventDate,
      eventStartTime,
      eventEndTime,
      estimatedTime,
      agenda,
      eventRegistrationLink,
      isPaidEvent,
      isOnlineEvent,
      organizerName,
      hasSeatBooking,
      seatLimit: hasSeatBooking ? seatLimit : 0,
      provideRegistrationLink,
      candidateLimit: provideRegistrationLink ? candidateLimit : 0,
      userEmail,
    };
    
    // If there's a new poster image, process and update it
    if (req.file) {
      let posterImage = req.file.buffer;
      posterImage = await sharp(posterImage)
        .resize({ width: 800 })
        .jpeg({ quality: 80 })
        .toBuffer();
      updatedEvent.posterImage = posterImage;
    }
    
    // Update the event in the database
    await Event.findByIdAndUpdate(eventId, updatedEvent);

    res.status(200).json({ message: 'Event updated successfully!' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ error: 'Error updating event. Please try again later.' });
  }
});




app.delete('/removeEvent/:eventId', async (req, res) => {
  const eventId = req.params.eventId;

  try {
    // Delete the event
    await Event.findByIdAndDelete(eventId);

    // Delete associated reservations
    await Reservation.deleteMany({ eventId });

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error removing event:', error);
    res.status(500).json({ error: 'An error occurred while removing the event.' });
  }
});

// Endpoint for unregistering from an event
app.post('/unregisterEvent', async (req, res) => {
  const { eventId, userEmail } = req.body;

  try {
    // Delete the reservation
    await Reservation.findOneAndDelete({ eventId, userEmail });

    res.status(204).send(); // No content
  } catch (error) {
    console.error('Error unregistering for event:', error);
    res.status(500).json({ error: 'An error occurred while unregistering for the event.' });
  }
});



app.get('/searchOrganizedEvents/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const query = req.query.q; // Get the search query from the request

    // Perform a case-insensitive search for organized events matching the query
    const organizedEvents = await Event.find({
      userEmail: email,
      eventTitle: { $regex: new RegExp(query, 'i') }
    });

    res.status(200).json(organizedEvents);
  } catch (error) {
    console.error('Error searching organized events:', error);
    res.status(500).json({ message: 'Error searching organized events. Please try again later.' });
  }
});

// Backend API endpoint to search for registered events
app.get('/searchRegisteredEvents/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const query = req.query.q; // Get the search query from the request

    // Perform a case-insensitive search for registered events matching the query
    const registeredEvents = await Reservation.find({
      userEmail: email,
      eventName: { $regex: new RegExp(query, 'i') }
    });

    res.status(200).json(registeredEvents);
  } catch (error) {
    console.error('Error searching registered events:', error);
    res.status(500).json({ message: 'Error searching registered events. Please try again later.' });
  }
});




app.get('/searchEvents/:email', async (req, res) => {
  try {
    const currentUserEmail = req.params.email;
    const searchTerm = req.query.query; // Get the search query parameter

    // Fetch reservations for all other users except the current user
    const otherUserReservations = await Reservation.find({ userEmail: { $ne: currentUserEmail } });

    // Fetch all eventIds for the reservations
    const eventIds = otherUserReservations.map((reservation) => reservation.eventId);

    // Fetch the details of the events that match the search query
    const matchingEvents = await Event.find({
      _id: { $in: eventIds },
      eventTitle: { $regex: searchTerm, $options: 'i' }, // Case-insensitive search
    });

    // Create a map of events for quick access
    const eventMap = matchingEvents.reduce((map, event) => {
      map[event._id.toString()] = event;
      return map;
    }, {});

    // Map combined event and reservation details to the desired format
    const matchedEventDetails = otherUserReservations.reduce((result, reservation) => {
      const event = eventMap[reservation.eventId.toString()];

      if (event) {
        result.push({
          eventName: event.eventTitle,
          eventDate: event.eventDate,
          eventStartTime: event.eventStartTime,
          eventEndTime: event.eventEndTime,
          userEmail: reservation.userEmail,
          seatsBooked: reservation.seatCount,
          registered: reservation.registered,
          remove: reservation.remove,
        });
      }

      return result;
    }, []);

    res.status(200).json(matchedEventDetails);
  } catch (error) {
    console.error('Error fetching matching events:', error);
    res.status(500).json({ message: 'Error fetching matching events. Please try again later.' });
  }
});

app.get('/searchYourRegisteredEvents/:email', async (req, res) => {
  try {
    const currentUserEmail = req.params.email;
    const searchTerm = req.query.query; // Get the search query parameter

    // Fetch reservations for the current user only
    const userReservations = await Reservation.find({ userEmail: currentUserEmail });

    // Fetch all eventIds for the reservations
    const eventIds = userReservations.map((reservation) => reservation.eventId);

    // Fetch the details of the events that match the search query and current user's reservations
    const matchingEvents = await Event.find({
      _id: { $in: eventIds },
      eventTitle: { $regex: searchTerm, $options: 'i' }, // Case-insensitive search
    });

    // Create a map of events for quick access
    const eventMap = matchingEvents.reduce((map, event) => {
      map[event._id.toString()] = event;
      return map;
    }, {});

    // Map combined event and reservation details to the desired format
    const matchedEventDetails = userReservations.reduce((result, reservation) => {
      const event = eventMap[reservation.eventId.toString()];

      if (event) {
        result.push({
          eventName: event.eventTitle,
          eventDate: event.eventDate,
          eventStartTime: event.eventStartTime,
          eventEndTime: event.eventEndTime,
          userEmail: reservation.userEmail,
          seatsBooked: reservation.seatCount,
          registered: reservation.registered,
          remove: reservation.remove,
        });
      }

      return result;
    }, []);

    res.status(200).json(matchedEventDetails);
  } catch (error) {
    console.error('Error fetching matching events:', error);
    res.status(500).json({ message: 'Error fetching matching events. Please try again later.' });
  }
});



const profileSchema = new mongoose.Schema({
  name: String,
  email: String,
  contactNumber: String,
  facebookLink: String,
  twitterLink: String,
});

const Profile = mongoose.model("Profile", profileSchema);

// Save or update the user's profile data
app.post("/api/profile", async (req, res) => {
  const { name, email, contactNumber, facebookLink, twitterLink } = req.body;

  try {
    // Check if a profile with the given email already exists
    const existingProfile = await Profile.findOne({ email });

    if (existingProfile) {
      // If a profile exists, update the existing data
      existingProfile.name = name;
      existingProfile.contactNumber = contactNumber;
      existingProfile.facebookLink = facebookLink;
      existingProfile.twitterLink = twitterLink;
      await existingProfile.save();
      res.status(200).json({ message: "Profile data updated successfully", profile: existingProfile });
    } else {
      // If no profile exists, create a new profile document
      const profile = new Profile({
        name,
        email,
        contactNumber,
        facebookLink,
        twitterLink,
      });
      await profile.save();
      res.status(201).json({ message: "Profile data saved successfully", profile });
    }
  } catch (error) {
    console.error("Error saving/updating profile data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

// Get the user's profile data by email
app.get("/api/profile/:email", async (req, res) => {
  const { email } = req.params;

  try {
    // Fetch the profile data from the database based on the email
    const profile = await Profile.findOne({ email });

    if (!profile) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // Return the profile data as a JSON response
    res.status(200).json({ profile });
  } catch (error) {
    console.error("Error fetching profile data:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});




const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Listening on port ${port}...`));
