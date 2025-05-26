// backend/controllers/employeeController.js
const Employee = require("../models/Employee");
const { uploadEmployeePhoto } = require("../middleware/uploadMiddleware"); // Переконайтесь, що цей шлях правильний
const path = require("path");

const projectRootForController = path.resolve(__dirname, "..", "..");
const publicPathBase = path.join(projectRootForController, "backend", "public");

const employeeController = {
  createEmployee: [
    uploadEmployeePhoto.single("employeePhotoFile"),
    async (req, res, next) => {
      let uploadedPhotoURL = null;
      try {
        const {
          lastName,
          firstName,
          middleName,
          positionId,
          phone,
          email,
          hireDate,
          salary,
          dismissalDate,
        } = req.body;

        if (req.file) {
          let relativeUrlPath = path.relative(publicPathBase, req.file.path);
          uploadedPhotoURL = "/" + relativeUrlPath.replace(/\\/g, "/");
        }

        if (
          !lastName ||
          !firstName ||
          !positionId ||
          !phone ||
          !hireDate ||
          salary === undefined ||
          salary === null
        ) {
          if (uploadedPhotoURL) Employee.deletePhotoFile(uploadedPhotoURL);
          return res.status(400).json({
            message:
              "Прізвище, Ім'я, Посада, Телефон, Дата прийому та Зарплата є обов'язковими.",
          });
        }
        if (
          salary !== null &&
          salary !== "" &&
          (isNaN(parseFloat(salary)) || parseFloat(salary) < 0)
        ) {
          if (uploadedPhotoURL) Employee.deletePhotoFile(uploadedPhotoURL);
          return res.status(400).json({
            message: "Зарплата має бути невід'ємним числом або порожньою.",
          });
        }
        if (hireDate && !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)) {
          if (uploadedPhotoURL) Employee.deletePhotoFile(uploadedPhotoURL);
          return res.status(400).json({
            message: "Невірний формат Дати прийому. Використовуйте YYYY-MM-DD.",
          });
        }
        if (
          dismissalDate &&
          dismissalDate !== "" &&
          !/^\d{4}-\d{2}-\d{2}$/.test(dismissalDate)
        ) {
          if (uploadedPhotoURL) Employee.deletePhotoFile(uploadedPhotoURL);
          return res.status(400).json({
            message:
              "Невірний формат Дати звільнення. Використовуйте YYYY-MM-DD або залиште порожнім.",
          });
        }

        const parsedPositionId = parseInt(positionId);
        if (isNaN(parsedPositionId)) {
          if (uploadedPhotoURL) Employee.deletePhotoFile(uploadedPhotoURL);
          return res
            .status(400)
            .json({ message: "PositionID має бути числом." });
        }

        const newEmployeeData = {
          lastName,
          firstName,
          middleName,
          positionId: parsedPositionId,
          phone,
          email,
          hireDate,
          salary: salary === "" || salary === null ? null : parseFloat(salary),
          dismissalDate: dismissalDate || null,
          photoURL: uploadedPhotoURL,
        };

        const createdEmployee = await Employee.create(newEmployeeData);
        res.status(201).json({
          message: "Працівника успішно створено",
          employee: createdEmployee,
        });
      } catch (error) {
        if (uploadedPhotoURL) {
          Employee.deletePhotoFile(uploadedPhotoURL);
        }
        console.error(
          "[CONTROLLER createEmployee] Помилка:",
          error.message,
          error
        );
        if (
          error.message.includes("вже існує") ||
          error.message.includes("не знайдено") ||
          error.message.includes("PositionID є обов'язковим") ||
          error.message.includes("Посаду з ID")
        ) {
          return res
            .status(
              error.message.includes("не знайдено") ||
                error.message.includes("PositionID є обов'язковим") ||
                error.message.includes("Посаду з ID")
                ? 400
                : 409
            )
            .json({ message: error.message });
        }
        next(error);
      }
    },
  ],

  getAllEmployees: async (req, res, next) => {
    try {
      const { search, all } = req.query;
      const isAdminContext = req.user && req.user.role === "admin";
      const includeDismissedEmployees =
        isAdminContext &&
        (String(all).toLowerCase() === "true" || String(all) === "1");

      const employees = await Employee.getAll(search || "", {
        includeDismissed: includeDismissedEmployees,
      });
      res.status(200).json(employees);
    } catch (error) {
      console.error("[CONTROLLER getAllEmployees] Помилка:", error);
      next(error);
    }
  },

  getEmployeeById: async (req, res, next) => {
    try {
      const { id } = req.params;
      const employee = await Employee.findById(id);
      if (!employee) {
        return res.status(404).json({ message: "Працівника не знайдено." });
      }
      res.status(200).json(employee);
    } catch (error) {
      console.error(
        `[CONTROLLER getEmployeeById] Помилка для ID ${req.params.id}:`,
        error
      );
      next(error);
    }
  },

  updateEmployee: [
    uploadEmployeePhoto.single("employeePhotoFile"),
    async (req, res, next) => {
      let newUploadedPhotoURLRelative = null;
      try {
        const { id } = req.params;
        const {
          lastName,
          firstName,
          middleName,
          positionId,
          phone,
          email,
          hireDate,
          salary,
          dismissalDate,
          removePhoto,
        } = req.body;

        const existingEmployee = await Employee.findById(id);
        if (!existingEmployee) {
          if (req.file && req.file.path) {
            let tempRelativeUrlPath = path.relative(
              publicPathBase,
              req.file.path
            );
            Employee.deletePhotoFile(
              "/" + tempRelativeUrlPath.replace(/\\/g, "/")
            );
          }
          return res
            .status(404)
            .json({ message: "Працівника не знайдено для оновлення." });
        }

        const updateData = {};

        if (lastName !== undefined) updateData.lastName = lastName;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (middleName !== undefined)
          updateData.middleName = middleName || null;

        if (positionId !== undefined) {
          if (
            positionId === "" ||
            positionId === null ||
            positionId === "null" ||
            String(positionId).trim() === "" ||
            String(positionId) === "undefined"
          ) {
            updateData.positionId = null;
          } else {
            const parsedPosId = parseInt(positionId);
            if (isNaN(parsedPosId)) {
              if (req.file) {
                let tempRelativeUrlPath = path.relative(
                  publicPathBase,
                  req.file.path
                );
                Employee.deletePhotoFile(
                  "/" + tempRelativeUrlPath.replace(/\\/g, "/")
                );
              }
              return res
                .status(400)
                .json({ message: "PositionID має бути числом або порожнім." });
            }
            updateData.positionId = parsedPosId;
          }
        }

        if (phone !== undefined) updateData.phone = phone;
        if (email !== undefined) updateData.email = email || null;

        if (hireDate !== undefined) {
          if (
            hireDate &&
            hireDate !== "" &&
            !/^\d{4}-\d{2}-\d{2}$/.test(hireDate)
          ) {
            if (req.file) {
              Employee.deletePhotoFile(
                "/" +
                  path
                    .relative(publicPathBase, req.file.path)
                    .replace(/\\/g, "/")
              );
            }
            return res
              .status(400)
              .json({ message: "Невірний формат дати прийому." });
          }
          updateData.hireDate = hireDate || null;
        }
        if (salary !== undefined) {
          if (
            salary !== null &&
            salary !== "" &&
            (isNaN(parseFloat(salary)) || parseFloat(salary) < 0)
          ) {
            if (req.file) {
              Employee.deletePhotoFile(
                "/" +
                  path
                    .relative(publicPathBase, req.file.path)
                    .replace(/\\/g, "/")
              );
            }
            return res.status(400).json({
              message: "Зарплата має бути числом >= 0 або порожньою.",
            });
          }
          updateData.salary =
            salary === "" || salary === null ? null : parseFloat(salary);
        }
        if (dismissalDate !== undefined) {
          if (
            dismissalDate &&
            dismissalDate !== "" &&
            !/^\d{4}-\d{2}-\d{2}$/.test(dismissalDate)
          ) {
            if (req.file) {
              Employee.deletePhotoFile(
                "/" +
                  path
                    .relative(publicPathBase, req.file.path)
                    .replace(/\\/g, "/")
              );
            }
            return res
              .status(400)
              .json({ message: "Невірний формат дати звільнення." });
          }
          updateData.dismissalDate = dismissalDate || null;
        }

        let oldPhotoURL = existingEmployee.PhotoURL;
        let shouldRemovePhoto = false;

        if (removePhoto) {
          if (Array.isArray(removePhoto)) {
            shouldRemovePhoto = removePhoto.some(
              (val) => String(val).toLowerCase() === "true"
            );
          } else {
            shouldRemovePhoto = String(removePhoto).toLowerCase() === "true";
          }
        }

        if (req.file) {
          if (oldPhotoURL) {
            Employee.deletePhotoFile(oldPhotoURL);
          }
          let relativeUrlPath = path.relative(publicPathBase, req.file.path);
          newUploadedPhotoURLRelative =
            "/" + relativeUrlPath.replace(/\\/g, "/");
          updateData.photoURL = newUploadedPhotoURLRelative;
        } else if (shouldRemovePhoto) {
          if (oldPhotoURL) {
            Employee.deletePhotoFile(oldPhotoURL);
          }
          updateData.photoURL = null;
        }

        if (Object.keys(updateData).length === 0) {
          if (
            newUploadedPhotoURLRelative !== null ||
            (shouldRemovePhoto && oldPhotoURL)
          ) {
            const stillCurrentEmployee = await Employee.findById(id);
            return res.status(200).json({
              message: "Фото працівника оновлено, інші дані без змін.",
              employee: stillCurrentEmployee,
            });
          }
          return res.status(200).json({
            message:
              "Дані для оновлення не надано, працівник залишається без змін.",
            employee: existingEmployee,
          });
        }

        await Employee.update(id, updateData);
        const updatedEmployee = await Employee.findById(id);
        res.status(200).json({
          message: "Дані працівника успішно оновлено",
          employee: updatedEmployee,
        });
      } catch (error) {
        console.error(
          "[CONTROLLER updateEmployee] Блок CATCH, помилка:",
          error.message,
          error
        );
        if (newUploadedPhotoURLRelative) {
          Employee.deletePhotoFile(newUploadedPhotoURLRelative);
        }

        if (
          error.message.includes("вже існує") ||
          error.message.includes("Невалідний PositionID") ||
          error.message.includes("не знайдено")
        ) {
          return res
            .status(
              error.message.includes("Невалідний PositionID") ||
                error.message.includes("не знайдено")
                ? 400
                : 409
            )
            .json({ message: error.message });
        }
        next(error);
      }
    },
  ],

  deleteEmployee: async (req, res, next) => {
    try {
      const { id } = req.params;

      const existingEmployee = await Employee.findById(id);
      if (!existingEmployee) {
        return res
          .status(404)
          .json({ message: "Працівника не знайдено для видалення." });
      }
      const success = await Employee.delete(id);
      if (!success) {
        return res.status(500).json({
          message:
            "Не вдалося видалити працівника. Можливо, він вже був видалений або виникла проблема з БД.",
        });
      }
      res.status(200).json({ message: "Працівника успішно видалено" });
    } catch (error) {
      console.error(
        `[CONTROLLER deleteEmployee] Помилка при видаленні ID ${req.params.id}:`,
        error.message,
        error
      );
      if (error.message.includes("Неможливо видалити працівника")) {
        return res.status(409).json({ message: error.message });
      }
      next(error);
    }
  },
};

module.exports = employeeController;
