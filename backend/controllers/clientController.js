// backend/controllers/clientController.js
const Client = require("../models/Client");

const clientController = {
  createClient: async (req, res, next) => {
    try {
      const {
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      } = req.body;

      // Валідація обов'язкових полів
      if (
        !contactPersonLastName ||
        !contactPersonFirstName ||
        !contactPersonPhone ||
        !cooperationStartDate
      ) {
        return res
          .status(400)
          .json({
            message:
              "ContactPersonLastName, ContactPersonFirstName, ContactPersonPhone, and CooperationStartDate are required.",
          });
      }
      // Валідація формату дати
      if (
        cooperationStartDate &&
        !/^\d{4}-\d{2}-\d{2}$/.test(cooperationStartDate)
      ) {
        return res
          .status(400)
          .json({
            message: "Invalid CooperationStartDate format. Use YYYY-MM-DD.",
          });
      }
      // Валідація телефону, email (можна додати regex)

      const newClient = await Client.create({
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      });
      res
        .status(201)
        .json({ message: "Client created successfully", client: newClient });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  getAllClients: async (req, res, next) => {
    try {
      const { search } = req.query;
      const clients = await Client.getAll(search);
      res.status(200).json(clients);
    } catch (error) {
      next(error);
    }
  },

  getClientById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const client = await Client.findById(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found." });
      }
      res.status(200).json(client);
    } catch (error) {
      next(error);
    }
  },

  updateClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const {
        clientCompanyName,
        contactPersonLastName,
        contactPersonFirstName,
        contactPersonMiddleName,
        contactPersonPhone,
        contactPersonEmail,
        cooperationStartDate,
      } = req.body;

      const updateData = {};
      if (clientCompanyName !== undefined)
        updateData.clientCompanyName = clientCompanyName;
      if (contactPersonLastName !== undefined)
        updateData.contactPersonLastName = contactPersonLastName;
      if (contactPersonFirstName !== undefined)
        updateData.contactPersonFirstName = contactPersonFirstName;
      if (contactPersonMiddleName !== undefined)
        updateData.contactPersonMiddleName = contactPersonMiddleName;
      if (contactPersonPhone !== undefined)
        updateData.contactPersonPhone = contactPersonPhone;
      if (contactPersonEmail !== undefined)
        updateData.contactPersonEmail = contactPersonEmail;
      if (cooperationStartDate !== undefined) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(cooperationStartDate))
          return res
            .status(400)
            .json({
              message: "Invalid CooperationStartDate format. Use YYYY-MM-DD.",
            });
        updateData.cooperationStartDate = cooperationStartDate;
      }

      if (Object.keys(updateData).length === 0) {
        return res
          .status(400)
          .json({ message: "No data provided for update." });
      }

      const existingClient = await Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found." });
      }

      const result = await Client.update(id, updateData);

      if (result.changedRows === 0 && result.affectedRows > 0) {
        return res
          .status(200)
          .json({
            message: "Client data was not changed.",
            client: await Client.findById(id),
          });
      }
      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Client not found or update failed." });
      }

      const updatedClient = await Client.findById(id);
      res
        .status(200)
        .json({
          message: "Client updated successfully",
          client: updatedClient,
        });
    } catch (error) {
      if (error.message.includes("already exists")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },

  deleteClient: async (req, res, next) => {
    try {
      const { id } = req.params;
      const existingClient = await Client.findById(id);
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found." });
      }

      const success = await Client.delete(id);
      if (!success) {
        return res
          .status(404)
          .json({
            message: "Client could not be deleted or was already deleted.",
          });
      }
      res.status(200).json({ message: "Client deleted successfully" });
    } catch (error) {
      if (error.message.includes("Cannot delete client")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },
};

module.exports = clientController;
