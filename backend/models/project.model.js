import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        unique: [true , 'Project name already exists'],
        trim: true,
    },

    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
    }]
})

const Project = mongoose.model('project', projectSchema);

export default Project;