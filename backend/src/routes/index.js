const { Router } = require("express");
const { router: authRouter } = require("./auth");
const { router: animalsRouter } = require("./animals");
const { router: milkRouter } = require("./milk");
const { router: charaRouter } = require("./chara");
const { router: reportsRouter } = require("./reports");
const { router: usersRouter } = require("./users");
const { router: buyersRouter } = require("./buyers");
const { router: sellersRouter } = require("./sellers");
const { router: whatsappRouter } = require("./whatsapp");

const appRouter = Router();

appRouter.use("/auth", authRouter);
appRouter.use("/animals", animalsRouter);
appRouter.use("/milk", milkRouter);
appRouter.use("/chara", charaRouter);
appRouter.use("/reports", reportsRouter);
appRouter.use("/users", usersRouter);
appRouter.use("/buyers", buyersRouter);
appRouter.use("/sellers", sellersRouter);
appRouter.use("/whatsapp", whatsappRouter);

function registerRoutes(app) {
  app.use(appRouter);
}

module.exports = { registerRoutes };

