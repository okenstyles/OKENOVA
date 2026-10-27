import { Router, type IRouter } from "express";
import healthRouter from "./health";
import okenovaRouter from "./okenova";

const router: IRouter = Router();

router.use(healthRouter);
router.use(okenovaRouter);

export default router;
