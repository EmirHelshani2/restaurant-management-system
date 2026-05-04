import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import tablesRouter from "./tables";
import reservationsRouter from "./reservations";
import menuRouter from "./menu";
import ordersRouter from "./orders";
import paymentsRouter from "./payments";
import inventoryRouter from "./inventory";
import staffRouter from "./staff";
import customersRouter from "./customers";
import reportsRouter from "./reports";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(tablesRouter);
router.use(reservationsRouter);
router.use(menuRouter);
router.use(ordersRouter);
router.use(paymentsRouter);
router.use(inventoryRouter);
router.use(staffRouter);
router.use(customersRouter);
router.use(reportsRouter);
router.use(settingsRouter);
router.use(notificationsRouter);

export default router;
