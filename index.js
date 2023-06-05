const express = require('express')
const app = express()
const morgan = require('morgan')
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
  origin: '*',
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions))
app.use(express.json())
app.use(morgan('dev'))


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb')
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mznotex.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
})


async function run() {
  try {
    const usersCollection = client.db('aircncDb').collection('users')
    const roomsCollection = client.db('aircncDb').collection('rooms')
    const bookingsCollection = client.db('aircncDb').collection('bookings')


    // generate jwt token 
    app.post('/jwt', (req, res) => { /* //!no need async */
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      // console.log(token)
      res.send({ token })
    })

    // save user email and role to database (using put to avoid duplicate)
    app.put('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const query = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })

    // get user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })


    // get all rooms
    app.get('/rooms', async (req, res) => {
      const result = await roomsCollection.find({}).toArray()
      res.send(result)
    })

    // get room posted by host filtered by email
    app.get('/rooms/:email', async (req, res) => {
      const email = req.params.email
      const query = { 'host.email': email }
      const result = await roomsCollection.find().toArray()
      res.send(result)
    })

    // delete a room from mylisting 
    app.delete('/rooms/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.deleteOne(query)
      res.send(result)
    })

    // get a single room
    app.get('/room/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await roomsCollection.findOne(query)
      res.send(result)
    })



    // save a room in db
    app.post('/rooms', async (req, res) => {
      const room = req.body
      const result = await roomsCollection.insertOne(room)
      res.send(result)
    })

    // update room booking status (so that a person can book only once) 
    app.patch('/rooms/status/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          booked: status,
        }
      }
      const update = await roomsCollection.updateOne(query, updateDoc)
      res.send(update)
    })


    // // Get all bookings for guest
    // app.get('/bookings/:email', async(req,res)=>{
    //   const email = req.params.email
    //   if(!email){
    //     res.send([])
    //   }
    //   const query = {'guest.email': email} /* to reach bookings>guest>email in db */
    //   const result = await bookingsCollection.find(query).toArray()
    //   res.send(result)
    // })

    // Get bookings for guest
    app.get('/bookings', async (req, res) => {
      const email = req.query.email

      if (!email) {
        res.send([])
      }
      const query = { 'guest.email': email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })


    // Get booking (listings) for host
    app.get('/bookings/host', async (req, res) => {
      const email = req.query.email

      if (!email) {
        res.send([])
      }
      const query = { host: email }
      const result = await bookingsCollection.find(query).toArray()
      res.send(result)
    })


    // save a booking in db
    app.post('/bookings', async (req, res) => {
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking)
      res.send(result)
    })

    // delete a booking from db
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.deleteOne(query)
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db('admin').command({ ping: 1 })
    console.log(
      'Pinged your deployment. You successfully connected to MongoDB!'
    )
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir)

app.get('/', (req, res) => {
  res.send('AirCNC Server is running..')
})

app.listen(port, () => {
  console.log(`AirCNC is running on port ${port}`)
})