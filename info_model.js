const { Timestamp } = require('mongodb');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const InfoModel = new Schema({
  name: String,
  status: Boolean,
  lat: Number,
  lon: Number,
  temp: Number,
  humi: Number,
  brightness: Number,
  incli: String,
  x: String,
  y: String,
  z: String,
  rsrp: Number,
  cellID: Number,
  history: [
    {
      temperature: Number,
      humidity: Number,
      brightness: Number,
      dateTime: Date,
      incli: String,
      rsrp: Number,
      cellID: Number,
    }
  ],
  schedule: [
    {
      time: String,
      value: Number,
      status: Boolean,
    }
  ]
})
module.exports = mongoose.model("Info", InfoModel);

