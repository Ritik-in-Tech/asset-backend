import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { getUser } from "../controllers/user/getuser.contoller.js";
import { getUserNotification } from "../controllers/user/getusernotification.controller.js";
import { updateUserNameAndEmail } from "../controllers/user/updateusername.controller.js";
import { setFCMToken } from "../controllers/user/setfcmtoken.controller.js";
import { updateUserAvtar } from "../controllers/user/updateuseravatar.controller.js";
import { getUserAvatar } from "../controllers/user/getuseravatart.controller.js";
import { checkProfileAndBusiness } from "../controllers/user/checkprofileandbusiness.js";
const router = Router();
// the user route always have to verify the jwt token using the auth token provided in authorization
router.use(verifyJWT);

// router to get the user deatils
router.route("/get-user").get(getUser);

// router to get the notifications for the specific user
router.route("/get-notification-user/:businessId").get(getUserNotification);

// router to update the user name
router.route("/update-user-name/:newName/:email").patch(updateUserNameAndEmail);

// router to update the FCM token
router.route("/set-fcm-token").patch(setFCMToken);

// router to update the user avatar
router.route("/update-user-avatar").patch(updateUserAvtar);

// router to get user avatar
router.route("/get-user-avatar").get(getUserAvatar);

router.route("/check-IsprofileCompleted").get(checkProfileAndBusiness);
export default router;
