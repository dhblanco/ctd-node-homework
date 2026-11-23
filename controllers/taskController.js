const pool = require("../db/pg-pool");

const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

async function create(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = taskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: `Task creation error: ${error.message}`,
    });
  }

  const result = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id)
     VALUES ($1, $2, $3)
     RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, global.user_id],
  );

  const task = result.rows[0];

  return res.status(201).json({
    id: task.id,
    title: task.title,
    isCompleted: task.is_completed,
  });
}

async function index(req, res) {
  const result = await pool.query(
    "SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id]
  );

  const tasks = result.rows;

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "No tasks found for this user",
    });
  }

  return res.status(200).json(tasks);
}

async function show(req, res) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Not a valid ID",
    });
  }
  const result = await pool.query(
    `SELECT id, title, is_completed FROM tasks
     WHERE id = $1 AND user_id = $2`,
    [taskId, global.user_id],
  );

  const foundTask = result.rows[0];

  if (!foundTask) {
    return res.status(404).json({
      message: "No task with that ID exists",
    });
  }

  return res.status(200).json(foundTask);
}

async function update(req, res) {
  if (!req.body) req.body = {};

  const { error, value } = patchTaskSchema.validate(req.body, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Invalid task",
      errors: error.details.map((detail) => detail.message)
    });
  }

  if (Object.keys(value).length === 0) {
    return res.status(400).json({
      message: "No fields provided to update",
    });
  }

  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }

  let keys = Object.keys(value);

  keys = keys.map((key) => (key === "isCompleted" ? "is_completed" : key));

  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");

  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;

  const result = await pool.query(
    `UPDATE tasks SET ${setClauses}
     WHERE id = ${idParm} AND user_id = ${userParm}
     RETURNING id, title, is_completed`,
    [...Object.values(value), taskId, global.user_id],
  );

  const updatedTask = result.rows[0];

  if (!updatedTask) {
    return res.status(404).json({
      message: "No matching task exists",
    });
  }

  return res.status(200).json(updatedTask);
}

async function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id, 10);

  if (Number.isNaN(taskId)) {
    return res.status(400).json({
      message: "Invalid task ID",
    });
  }


  const result = await pool.query(
    `DELETE FROM tasks
     WHERE id = $1 AND user_id = $2
     RETURNING id, title, is_completed`,
    [taskId, global.user_id],
  );

  const deletedTask = result.rows[0];

  if (!deletedTask) {
    return res.status(404).json({
      message: "No existing tasks match this task ID",
    });
  }

  return res.status(200).json(deletedTask);
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
