import mongoose from "mongoose";

console.log(process.env.MONGO_URL);

function connect() {
    mongoose.connect(process.env.MONGO_URL).
        then(() => {
            console.log("Connected to databse");
        }).
        catch((err) => {
            console.log(err + ' : Some error form database connection');
        })
}

export default connect;