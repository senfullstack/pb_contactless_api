const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { getOAuth } = require("./opera");
const { default: axios } = require("axios");
require("dotenv").config();
const app = express();
const moment = require("moment-timezone");
const url = require("url");

app.use(cors());
app.use(bodyParser.json());

const currentDate = moment()
  .tz("America/New_York")
  .add(0, "days")
  .format("YYYY-MM-DD");
const currentdateplus1 = moment()
  .tz("America/New_York")
  .add(1, "days")
  .format("YYYY-MM-DD");

const operaAxios = axios.create({
  baseURL: process.env.BaseUrl,
  headers: {
    "Content-Type": "application/json",
    "x-app-key": process.env.AppKey,
    "x-hotelid": process.env.HotelId,
  },
});
//console.log(currentDate)

// operaAxios.interceptors.request.use(req => {
//   console.log(`${JSON.stringify(req, null, 2)}`);
//   return req;
// });

// operaAxios.interceptors.response.use(res => {
//   console.log(res.data);
//   return res;
// });

app.post("/getToken", async (req, res) => {
  try {
    const token = await getOAuth();
    return res.json({ token });
  } catch (e) {
    res.status(404);
    return res.json({ error: e });
  }
});

app.use(function (req, res, next) {
  if (req.headers?.authorization === "Bearer null") {
    res.status(403);
    return res.json({ error: "unauthorize" });
  }
  operaAxios.defaults.headers.common["Authorization"] =
    req.headers.authorization;
  next();
});

app.post("/reservation", async (req, res) => {
  console.log("\n\nPOST >> Reservation");
  console.log("\n\n-------------------");
  const {
    guest: { firstName, lastName },
  } = req.body;

  if (!firstName || !lastName) {
    return res.status(400).send("Guest firstname or lastname is required");
  }

  const profilePayload = {
    guestDetails: {
      customer: {
        personName: [
          {
            givenName: firstName,
            surname: lastName,
            nameType: "PRIMARY",
          },
        ],
      },
      profileType: "GUEST",
      statusCode: "ACTIVE",
      registeredProperty: process.env.HotelId,
      markForHistory: false,
    },
  };
  const response = {};
  try {
    console.log("\n\n1) POST >> Create Profiles");
    console.log("\n\nURL : /crm/v1/guests");
    console.log("\n\npayload", JSON.stringify(profilePayload));
    const profileRes = await operaAxios.post("/crm/v1/guests", profilePayload);
    console.log("\n\nresponse: ", JSON.stringify(profileRes.data));
    const profileId = profileRes.headers.location.split("/").pop();
    response["guestProfileId"] = profileId;
    response["guest"] = { firstName, lastName };

    if (profileId) {
      console.log("\n\n2) GET >> Get Rooms Availability");
      console.log(
        "\n\nURL : ",
        `/par/v0/hotels/${process.env.HotelId}/availability?roomStayStartDate=${currentDate}&roomStayEndDate=${currentdateplus1}&adults=1&children=0&roomStayQuantity=1&limit=1`
      );

      const getAvailability = await operaAxios.get(
        `/par/v0/hotels/${process.env.HotelId}/availability?roomStayStartDate=${currentDate}&roomStayEndDate=${currentdateplus1}&adults=1&children=0&roomStayQuantity=1&limit=1`
      );
      console.log("\n\nresponse: ", JSON.stringify(getAvailability.data));

      const availableRoomTypes = await getAvailability.data;
      const firstAvailableRoomType =
        availableRoomTypes.hotelAvailability?.[0].roomStays?.[0].roomRates?.[0];

      let amountBeforeTax = firstAvailableRoomType?.total?.amountBeforeTax
        ? firstAvailableRoomType?.total?.amountBeforeTax
        : process.env.amountBeforeTax;
      let currencyCode = firstAvailableRoomType?.total?.currencyCode
        ? firstAvailableRoomType?.total?.currencyCode
        : process.env.currencyCode;
      let marketCode = firstAvailableRoomType?.marketCode
        ? firstAvailableRoomType?.marketCode
        : process.env.marketCode;
      let roomType = firstAvailableRoomType?.roomType
        ? firstAvailableRoomType?.roomType
        : process.env.roomType;
      let ratePlanCode = firstAvailableRoomType?.ratePlanCode
        ? firstAvailableRoomType?.ratePlanCode
        : process.env.ratePlanCode;

      const reservedRoomDetails = {
        amountBeforeTax,
        currencyCode,
        marketCode,
        roomType,
        ratePlanCode,
      };

      console.log("\n\n3) GET >> Get first available room");
      console.log(
        "\n\nURL : ",
        `/fof/v0/hotels/${process.env.HotelId}/rooms?hotelRoomStartDate=${currentDate}&hotelRoomEndDate=${currentdateplus1}&roomType=${roomType}&limit=1`
      );

      const getRoomsRes = await operaAxios.get(
        `/fof/v0/hotels/${process.env.HotelId}/rooms?hotelRoomStartDate=${currentDate}&hotelRoomEndDate=${currentdateplus1}&roomType=${roomType}&limit=1`
      );

      console.log("\n\nresponse: ", JSON.stringify(getRoomsRes.data));
      const roomData = await getRoomsRes.data;
      const availableRoom = roomData.hotelRoomsDetails.room?.[0];
      const roomId = availableRoom?.roomId;

      const reservationPayload = {
        reservations: {
          reservation: {
            reservationGuests: {
              profileInfo: {
                profileIdList: {
                  id: profileId,
                  type: "Profile",
                },
              },
            },
            reservationPaymentMethods: {
              paymentMethod: "CA",
            },
            markAsRecentlyAccessed: true,
            hotelId: process.env.HotelId,
            reservationStatus: "Reserved",
            roomStay: {
              guarantee: {
                onHold: true,
                guaranteeCode: "6PM",
              },
              roomRates: {
                numberOfUnits: 1,
                rates: {
                  rate: {
                    start: currentDate,
                    end: currentdateplus1,
                    base: {
                      amountBeforeTax: amountBeforeTax,
                      currencyCode: currencyCode,
                    },
                  },
                },
                start: currentDate,
                end: currentdateplus1,
                marketCode: marketCode,
                roomTypeCharged: roomType,
                ratePlanCode: ratePlanCode,
                roomType: roomType,
                pseudoRoom: false,
              },
              guestCounts: {
                children: 0,
                adults: 1,
              },
              arrivalDate: currentDate,
              departureDate: currentdateplus1,
            },
            // externalReferences: [
            //   {
            //     id: "98765",
            //     idExtension: 1,
            //     idContext: "PHOTOBUTLER",
            //   },
            // ],
            // sourceOfSale: {
            //   sourceType: "PMS",
            //   sourceCode: process.env.HotelId,
            // },
          },
        },
      };

      console.log("\n\n4) POST >> Reservation");
      console.log(
        "\n\nURL : ",
        `/rsv/v1/hotels/${process.env.HotelId}/reservations`
      );
      console.log("\n\npayload: ", JSON.stringify(reservationPayload));

      const reservationRes = await operaAxios.post(
        `/rsv/v1/hotels/${process.env.HotelId}/reservations`,
        reservationPayload
      );

      console.log("\n\nResponse: ", JSON.stringify(reservationRes.data));

      const reservationId = reservationRes.headers.location.split("/").pop();

      response["reservationId"] = reservationId;
      response["roomDetails"] = {
        ...availableRoom,
        ...reservedRoomDetails,
      };

      const postRoomAssignmentPayload = {
        criteria: {
          hotelId: process.env.HotelId,
          reservationIdList: [
            {
              id: reservationId,
              type: "Reservation",
            },
          ],
          roomId: roomId,
          overrideInstructions: {
            dirtyRoom: true,
          },
          updateRoomTypeCharged: true,
          includeDepartureRooms: true,
          roomNumberLocked: true,
        },
      };

      console.log("\n\n5) POST >> Post Room Assignment");
      console.log(
        "\n\nURL : ",
        `/fof/v0/hotels/${process.env.HotelId}/reservations/${reservationId}/roomAssignments`
      );
      console.log("\n\npayload: ", JSON.stringify(postRoomAssignmentPayload));

      const postRoomAssignment = await operaAxios.post(
        `/fof/v0/hotels/${process.env.HotelId}/reservations/${reservationId}/roomAssignments`,
        postRoomAssignmentPayload
      );
      console.log("\n\nResponse: ", JSON.stringify(postRoomAssignment.data));
      console.log(
        "\n\n---------------------------------------------------------------------------------------------"
      );
      response["RoomAssignment"] = postRoomAssignment.data;
      return res.json({ ...response });
    }
  } catch (e) {
    res.status(404);
    return res.json({ error: e?.response?.data ? e?.response?.data : e });
  }
});

app.get("/reservation", async (req, res) => {
  console.log("\n\nGET >> Reservation");
  console.log("\n\n------------------");

  const { reservationId } = req.query;
  if (!reservationId) {
    return res.status(400).send("reservationIdList is required");
  }

  const response = {};

  try {
    console.log("\n\n1) GET >> Get Reservation");
    console.log(
      "\n\nURL : ",
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    const findReservationById = await operaAxios.get(
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    console.log("\n\nresponse: ", JSON.stringify(findReservationById.data));
    console.log(
      "\n\n---------------------------------------------------------------------------------------------"
    );
    const reservationsData = await findReservationById.data;
    if (!reservationsData?.reservations?.reservation?.[0]) {
      return res
        .status(400)
        .send(`Reservation : ${reservationId} is not found`);
    }

    response["reservationDetails"] =
      reservationsData?.reservations?.reservation?.[0];

    return res.json({ ...response });
  } catch (e) {
    res.status(400);
    return res.json({ error: e?.response?.data ? e?.response?.data : e });
  }
});

app.get("/searchReservation", async (req, res) => {
  console.log("\n\nGET >> Search Reservation");
  console.log("\n\n-------------------------");

  const parsedUrl = url.parse(req.url);
  const response = {};

  try {
    console.log("\n\n1) GET >> Get Reservation");
    console.log(
      "\n\nURL : ",
      `/rsv/v1/hotels/${process.env.HotelId}/reservations${parsedUrl.search}`
    );

    const findReservationById = await operaAxios.get(
      `/rsv/v1/hotels/${process.env.HotelId}/reservations${parsedUrl.search}`
    );

    console.log("\n\nresponse: ", JSON.stringify(findReservationById.data));

    const reservationsData = await findReservationById.data;

    if (!reservationsData) {
      return res.status(400).send(`Reservation : not found`);
    }

    response["reservationDetails"] = reservationsData;
    console.log(
      "\n\n---------------------------------------------------------------------------------------------"
    );
    return res.json({ ...response });
  } catch (e) {
    res.status(404);
    return res.json({ error: e?.response?.data ? e?.response?.data : e });
  }
});

app.post("/checkin", async (req, res) => {
  console.log("\n\nPOST >> Checkin ");
  console.log("\n\n----------------");

  const { reservationId } = req.body;

  if (!reservationId) {
    return res.status(400).send("reservationId is required");
  }

  const response = {};

  try {
    console.log("\n\n1) GET >> Get Reservation");
    console.log(
      "\n\nURL : ",
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    const findReservationById = await operaAxios.get(
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    console.log("\n\nresponse: ", JSON.stringify(findReservationById.data));

    const reservationsData = await findReservationById.data;
    if (!reservationsData?.reservations?.reservation?.[0]) {
      return res
        .status(400)
        .send(`Reservation : ${reservationId} is not found`);
    }

    response["reservationDetails"] =
      reservationsData?.reservations?.reservation?.[0];

    const roomId =
      reservationsData?.reservations?.reservation?.[0]?.roomStay
        ?.currentRoomInfo?.roomId;
    const startDate =
      reservationsData?.reservations?.reservation?.[0]?.roomStay?.arrivalDate;
    const endDate =
      reservationsData?.reservations?.reservation?.[0]?.roomStay?.departureDate;

    const checkInPayload = {
      reservation: {
        roomId: roomId,
        ignoreWarnings: true,
        stopCheckin: false,
        printRegistration: false,
      },
      fetchReservationInstruction: ["ReservationDetail"],
      includeNotifications: true,
    };

    console.log("\n\n2) POST >> CheckIns");
    console.log(
      "\n\nURL : ",
      `/fof/v1/hotels/${process.env.HotelId}/reservations/${reservationId}/checkIns`
    );

    console.log("\n\npayload: ", JSON.stringify(checkInPayload));

    const checkInRes = await operaAxios.post(
      `/fof/v1/hotels/${process.env.HotelId}/reservations/${reservationId}/checkIns`,
      checkInPayload
    );

    console.log("\n\nresponse: ", JSON.stringify(checkInRes.data));

    const checkinData = await checkInRes.data;

    response["checkin"] = checkinData ?? {};

    console.log(
      "\n\n---------------------------------------------------------------------------------------------"
    );

    return res.json({ ...response });
  } catch (e) {
    res.status(404);
    return res.json({ error: e?.response?.data ? e?.response?.data : e });
  }
});

app.post("/checkout", async (req, res) => {
  console.log("\n\nPOST >> Checkout ");
  console.log("\n\n----------------");

  const { reservationId } = req.body;
  if (!reservationId) {
    return res.status(400).send("reservationId is required");
  }

  const response = {};

  try {
    console.log("\n\n1) GET >> Get Reservation");
    console.log(
      "\n\nURL : ",
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    const findReservationById = await operaAxios.get(
      `/rsv/v1/hotels/${process.env.HotelId}/reservations/${reservationId}?fetchInstructions=Reservation`
    );

    console.log("\n\nresponse:", JSON.stringify(findReservationById.data));

    const reservationsData = await findReservationById.data;

    if (!reservationsData?.reservations?.reservation?.[0]) {
      return res
        .status(400)
        .send(`Reservation : ${reservationId} is not found`);
    }

    response["reservationDetails"] =
      reservationsData?.reservations?.reservation?.[0];

    const checkoutPayload = {
      reservation: {
        reservationIdList: {
          id: reservationId,
          type: "Reservation",
        },
        stopCheckout: false,
        cashierId: 3,
        hotelId: process.env.HotelId,
        eventType: "CheckOut",
        autoCheckout: false,
        checkoutInstr: {
          roomStatus: "Dirty",
          ignoreWarnings: true,
        },
      },
      verificationOnly: false,
    };

    console.log("\n\n2) POST >> checkOuts");
    console.log(
      "\n\nURL : ",
      `/csh/v0/hotels/${process.env.HotelId}/reservations/${reservationId}/checkOuts`
    );
    console.log("\n\npayload: ", JSON.stringify(checkoutPayload));

    const checkOutRes = await operaAxios.post(
      `/csh/v0/hotels/${process.env.HotelId}/reservations/${reservationId}/checkOuts`,
      checkoutPayload
    );

    console.log("\n\nresponse: ", JSON.stringify(checkOutRes.data));

    const checkOutData = await checkOutRes.data;

    response["checkout"] = checkOutData ?? {};

    console.log(
      "\n\n---------------------------------------------------------------------------------------------"
    );

    return res.json({ ...response });
  } catch (e) {
    res.status(404);
    return res.json({ error: e?.response?.data ? e?.response?.data : e });
  }
});

app.use("*", function (req, res) {
  res.status(404).send("Request failed with status code 404");
});

module.exports = app;
