const mongoose = require('mongoose');
const uri_compass = "mongodb://127.0.0.1/list_lamp"
const uri_cloud = "mongodb+srv://xuanlocok:lH0otbWNCCVTJijO@cluster0.cmpfhru.mongodb.net/?retryWrites=true&w=majority";


async function connect() {
    try {
        await mongoose.set('strictQuery', true);
        await mongoose.connect(uri_cloud, {
            useNewUrlParser: true
        })
        console.log('Connect db success')
    } catch (error) {
        console.log(error)
    }
};
module.exports = { connect };