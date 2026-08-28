import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import suppliersRouter from "./suppliers";
import productsRouter from "./products";
import customersRouter from "./customers";
import purchasesRouter from "./purchases";
import purchaseReturnsRouter from "./purchase-returns";
import salesRouter from "./sales";
import dashboardRouter from "./dashboard";
import reportsRouter from "./reports";
import accountsRouter from "./accounts";
import settingsRouter from "./settings";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(suppliersRouter);
router.use(productsRouter);
router.use(customersRouter);
router.use(purchasesRouter);
router.use(purchaseReturnsRouter);
router.use(salesRouter);
router.use(dashboardRouter);
router.use(reportsRouter);
router.use(accountsRouter);
router.use(settingsRouter);

export default router;
