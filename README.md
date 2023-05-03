# Server Project`
## Development server

Run `npm i` first time for install the dependency packages.

Run `npm start` for a dev server. Navigate to `http://localhost:3200/`. The application will automatically reload if you change any of the source files.

=============================================================================================================

# API`

## Get Token

Receive oAuth Token

    URL: http://localhost:3002/getToken

    Method: POST

    Payload: {}

## Post Reservation 

    URL: http://localhost:3002/reservation

    Method: POST

    Body : 
        data : {
            "guest": {
                "firstName": "Krishna",
                "lastName": "Subaraj"
            }
        }

## Get Reservation by ID

    URL: http://localhost:3002/reservation?reservationId={{149464}}

    Method: GET

    
## Get Reservation by any

    URL: http://localhost:3002/searchReservation?arrivalEndDate={{data}}&arrivalStartDate={{data}}&departureEndDate={{data}}&departureStartDate={{data}}&surname={{data}}&givenName={{data}}&roomId={{data}}

    Method: GET

## Post Check-In

    URL: http://localhost:3002/checkin

    Method: POST

    Body : 
        data : {
            {
                "reservationId":  "149452"
            }
        }

## Post Check-Out

    URL: http://localhost:3002/checkout

    Method: POST

    Body: 
        data: {
            {
                "reservationId":  "149452"
            }
        }