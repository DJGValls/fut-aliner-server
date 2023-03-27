const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { isAuthenticated } = require("../middlewares/auth.middlewares");
const User = require("../models/User.model");
const Player = require("../models/Player.model");

// POST "/api/player/create-player"
router.post("/create-player", isAuthenticated, async (req, res, next) => {
  const { portero, defensa, tecnica, ataque, cardio, grupo, role, user } =
    req.body;
  //   console.log(req.payload);
  try {
    const createdPlayer = await Player.create({
      portero,
      defensa,
      tecnica,
      ataque,
      cardio,
      grupo,
      role,
      user: req.payload._id,
    });
    // to add the id of the new player created to user arrays of players
    const updateUser = await User.findByIdAndUpdate(
      req.payload._id,
      {
        $push: { players: createdPlayer._id },
      },
      { safe: true, upsert: true, new: true }
    );
    return res.status(201).json();
  } catch (error) {
    next(error);
  }
});

// PATCH "/api/player/:playerId/votes"
router.patch("/:playerId/votes", isAuthenticated, async (req, res, next) => {
  const { portero, defensa, tecnica, ataque, cardio } = req.body;
  const { playerId } = req.params;
  const date = new Date();
  const currentYear = date.getFullYear();
  const currentMonth = date.getMonth();
  const currentDay = date.getDate();

  // No fields are empty
  if (!portero || !defensa || !tecnica || !ataque || !cardio) {
    return res
      .status(400)
      .json({ errorMessage: "Todos los campos deben estar completos" });
  }

  try {
    const foundPlayer = await Player.findById(playerId);
    const lastUpdatedDate = foundPlayer.updatedAt;
    const lastUpdatedYear = lastUpdatedDate.getFullYear();
    const lastUpdatedMonth = lastUpdatedDate.getMonth();
    const lastUpdatedDay = lastUpdatedDate.getDate();

    //  no votes for your own player profiles
    if (foundPlayer.user === req.payload._id) {
      return res.status(400).json({
        errorMessage:
          "No puedes votar a perfiles de jugador que te pertenezcan",
      });
    }
    // aplied only first time the player receives a votation
    if (foundPlayer.votes === 0) {
      await Player.findByIdAndUpdate(playerId, {
        portero,
        defensa,
        tecnica,
        ataque,
        cardio,
        votes: foundPlayer.votes + 1,
      });
    } else {
      // 1 vote per day
      console.log(lastUpdatedDate);
      console.log(date);
      console.log(currentYear, lastUpdatedYear);
      if (
        currentYear === lastUpdatedYear &&
        currentMonth === lastUpdatedMonth &&
        currentDay === lastUpdatedDay
      ) {
        return res
          .status(400)
          .json({ errorMessage: "Solo puedes votar una vez al dia" });
      } else {
        await Player.findByIdAndUpdate(playerId, {
          portero: ((foundPlayer.portero + Number(portero)) / 2).toFixed(2),
          defensa: ((foundPlayer.defensa + Number(defensa)) / 2).toFixed(2),
          tecnica: ((foundPlayer.tecnica + Number(tecnica)) / 2).toFixed(2),
          ataque: ((foundPlayer.ataque + Number(ataque)) / 2).toFixed(2),
          cardio: ((foundPlayer.cardio + Number(cardio)) / 2).toFixed(2),
          votes: foundPlayer.votes + 1,
        });
      }
    }
  } catch (error) {
    next(error);
  }
  try {
    const foundPlayer = await Player.findById(playerId);
    const totalPoints =
      foundPlayer.portero +
      foundPlayer.defensa +
      foundPlayer.tecnica +
      foundPlayer.ataque +
      foundPlayer.cardio;
    await Player.findByIdAndUpdate(playerId, {
      total: (totalPoints / 5).toFixed(2),
    });
    res.status(200).json();
  } catch (error) {
    next(error);
  }
});

// GET "/api/player/:playerId"
router.get("/:playerId", isAuthenticated, async (req, res, next) => {
  const { playerId } = req.params;
  try {
    const foundPlayer = await Player.findById(playerId);
    // console.log(foundPlayer.user);
    res.status(200).json(foundPlayer);
  } catch (error) {
    next(error);
  }
});

// DELETE "/api/player/:playerId/delete"
router.delete("/:playerId/delete", isAuthenticated, async (req, res, next) => {
  const { playerId } = req.params;
  try {
    const foundPlayer = await Player.findById(playerId);

    if (req.payload._id == foundPlayer.user) {
      await Player.findByIdAndDelete(playerId);
      return res.status(200).json("personaje borrado");
    } else {
      return res.status(400).json({
        errorMessage:
          "No puedes borrar un perfil de jugador que no te pertenezca",
      });
    }
  } catch (error) {
    next(error);
  }
});

module.exports = router;