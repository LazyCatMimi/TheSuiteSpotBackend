import { ObjectId } from "mongodb";

const userRoutes = (app, client, database) => {
  // Login route
  app.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Check if user exists with the given email
      const existingUser = await database
        .collection("User_Accounts")
        .findOne({ email });

      if (existingUser) {
        // Check if the password matches
        if (existingUser.password === password) {
          res
            .status(200)
            .json({ user: existingUser, message: "Login successful" });
        } else {
          res.status(401).json({ error: "Invalid password" });
        }
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      console.error("Error logging in:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  });

  // Signup route
  app.post("/signup", async (req, res) => {
    try {
      console.log("Received signup request:", req.body); // Log received signup request

      const { name, phoneNumber, email, password, appointments, shoppingCart } = req.body;

      // Check if user already exists with the given email
      const existingUser = await database
        .collection("User_Accounts")
        .findOne({ email });
      if (existingUser) {
        console.log("User with this email already exists:", email); // Log existing user
        return res
          .status(400)
          .json({ error: "User with this email already exists" });
      }

      console.log("Creating new user:", email); // Log new user creation

      // Create a new user document
      const newUser = {
        name,
        phoneNumber,
        email,
        password,
        appointments,
        shoppingCart,
      };

      // Insert the new user into the 'User_Accounts' collection
      await database.collection("User_Accounts").insertOne(newUser);

      console.log("User created successfully:", email); // Log successful user creation

      res
        .status(201)
        .json({ user: newUser, message: "User created successfully" });
    } catch (error) {
      console.error("Error creating user:", error);
      res
        .status(500)
        .json({ error: "Internal Server Error", details: error.message });
    }
  });

  //for the bookings in appt_overview (in progress)
  app.post("/bookings", async (req, res) => {

    try {
      const { userId, serviceTitle, totalCost, date, time,
        serviceName, bookStatus, duration, provProfPic, provProfId, staff } = req.body;

      const user = await database.collection('User_Accounts').findOne({ _id: new ObjectId(userId) });
      const maxId = user.appointments.reduce((max, appointment) => Math.max(max, appointment.id), 0);
      const newAppointmentId = maxId + 1;

      const newAppointment = {
        date: date,
        id: newAppointmentId,
        location: serviceName,
        services: serviceTitle.join(", "), // each service selected is seperated by a comma
        staff: staff,
        status: bookStatus,
        time: time,
        duration: duration,
        price: `$${totalCost}`,
        provProfId: provProfId,
        provProfPic: provProfPic,
        userID: userId
      };

      // Insert the newAppointment object into the MongoDB collection
      const result = await database.collection("User_Accounts").updateOne(
        { _id: new ObjectId(userId) },
        { $push: { appointments: newAppointment } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      if (result.modifiedCount === 0) {
        return res.status(400).json({ error: "Appointment could not be booked" });
      }

      res.status(201).json({
        message: "Appointment booked successfully",
        appointment: newAppointment
      });
    } catch (error) {
      console.error("Error booking appointment:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.message });
    }
  });


  app.post("/cancel", async (req, res) => {
    try {
      const { userId, appointmentId } = req.body;
      const updateResult = await database.collection("User_Accounts").updateOne(
        { _id: new ObjectId(userId), "appointments.id": appointmentId },
        { $set: { "appointments.$.status": "cancelled" } }
      );

      if (updateResult.modifiedCount === 0) {
        res.status(404).send("Appointment not found or already cancelled.");
        return;
      }

      res.status(200).json({ message: "Appointment cancelled successfully" });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      res.status(500).json({ error: "Internal Server Error", details: error.toString() });
    }
  });
};

export default userRoutes;
