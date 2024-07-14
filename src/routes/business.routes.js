import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { createBusiness } from "../controllers/business/createbusiness.controller.js";
import { updateBusinessDetails } from "../controllers/business/updatebusiness.controller.js";
import { joinBusiness } from "../controllers/business/joinbusiness.controller.js";
import getBusinessRequests from "../controllers/business/getbusinessrequest.controller.js";
import { acceptUserJoinRequest } from "../controllers/business/acceptuserjoinrequest.controller.js";
import { getBusinessUsers } from "../controllers/business/getbusinessusers.controller.js";
import { getBusinessAcceptedRequests } from "../controllers/business/getbusinessacceptedrequests.controller.js";
import { declineUserJoinRequest } from "../controllers/business/declinejoinrequest.controller.js";
import { getBusinessDetails } from "../controllers/business/getbusinessdetail.controller.js";
import { promoteUser } from "../controllers/business/promotouser.controller.js";
import { demoteUser } from "../controllers/business/demotouser.controller.js";
import { promoteToAdmin } from "../controllers/business/promotetoadmin.controller.js";
import { changeManager } from "../controllers/business/changemanager.controller.js";
const router = Router();

router.use(verifyJWT);

// create business
router.route("/create-business").post(createBusiness);

// update business details
router
  .route("/update-business-deatils/:businessId")
  .patch(updateBusinessDetails);

// join business
router.route("/join-business/:businessCode").post(joinBusiness);

// getBusiness request
router.route("/get-business-request/:businessId").get(getBusinessRequests);

// accept business request
router
  .route("/accept-business-request/:businessId")
  .post(acceptUserJoinRequest);

// businessUser
router.route("/get-business-users/:businessId").get(getBusinessUsers);

// get accepted businessrequest
router
  .route("/get-accepted-business-requests/:businessId")
  .get(getBusinessAcceptedRequests);

// decline the join request of the user
router
  .route("/decline-user-join-request/:businessId")
  .post(declineUserJoinRequest);

router.route("/get-business-details/:businessId").get(getBusinessDetails);

router.route("/promotion/:businessId").patch(promoteUser);

router.route("/demote/:businessId").patch(demoteUser);

router
  .route("/promote/admin/:businessId/:userIdToPromote")
  .patch(promoteToAdmin);

router.route("/change-manager/:businessId/:userId").patch(changeManager);

export default router;
