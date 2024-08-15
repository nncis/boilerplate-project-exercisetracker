const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Body parser
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));

//Connect to database
const connectDB = async() => {
  try {
    await mongoose.connect(process.env.DB_URI);
    console.log('mongodb connected');
  } catch(err) {
    console.log('Connection error',err.message);
  }
}
connectDB()

//Mongoose models
const userSchema = new mongoose.Schema({
  username: {
      type: String,
      required: true,
      unique: true
  },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: {
      type: String,
      required: true,
  },
  description: {
      type: String,
      required: true
  },
  duration: {
      type: Number,
      required: true
  },
  date: {
      type: Date,
  }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

//Routes

//User 
app.post('/api/users', async(req, res) => {
  try {
		const newUser = new User({
			username: req.body.username
		})
		const saveUser = await newUser.save()
		res.json(saveUser)
	} catch (err) {
		console.log(err);
	}
})

app.get('/api/users', async(req, res) => {
  try {
		User.find().select('_id username')
		.then(users => res.json(users))
		.catch(err => console.log(err))
	} catch(err){
		console.log(err)
	}
})

//Exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
	try {
		const id = req.params._id;
		User.findById(id)
		.then(user => {
			const { description, duration, date } = req.body;
			
				const newExercise = new Exercise({
					user_id: user._id,
					description,
					duration,
					date: date ? new Date(date) : new Date()
				})
				newExercise.save();
				res.json({
					_id: user._id,
					username: user.username,
					description: newExercise.description,
					duration: newExercise.duration,
					date: new Date(newExercise.date).toDateString()
				})
			})
			.catch(err => {
				console.log(err);
				res.send('Could not find User id')
			})
	} catch (err) {
		console.log(err)
	}
});

//Log
app.get('/api/users/:_id/logs', async(req, res) => {
  const {from, to, limit} = req.query;
  const id = req.params._id;
  const user = await User.findById(id);

  if(!user){
    return
  }

  let dateObj = {};
  if(from){
    dateObj.$gte = new Date(from)
  }
  if(to){
    dateObj.$lte = new Date(to)
  }

  let filter = {
    user_id: id
  }

  if(from || to){
    filter.date = dateObj;
  }

  const exercises = await Exercise.find(filter).limit(+limit ?? 500)

  const log = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }))

  res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log
  })

})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
