import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares";
import { getUser } from "../controllers/user/getuser.contoller";
const router = Router();

router.use(verifyJWT);

router.route("/get-user").get(getUser);

export default router;
