const express = require("express");
const router = express.Router();
const todoController = require("../controllers/todoController");
const auth = require("../middleware/auth"); // nëse ke autentikim

router.get("/", auth.verifyToken, todoController.getTodos);
router.post("/", auth.verifyToken, todoController.addTodo);
router.delete("/:id", auth.verifyToken, todoController.deleteTodo);

module.exports = router;