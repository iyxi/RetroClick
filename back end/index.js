const app = require('./app')

require('dotenv').config()

const PORT = process.env.PORT || 3000

const db = require('./models')

// Validate DB connection and synchronize models before starting the server
db.sequelize.authenticate()
    .then(() => db.sequelize.sync())
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`)
        })
    })
    .catch((err) => {
        console.error('Unable to connect to the database or synchronize models:', err)
        process.exit(1)
    })