const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.json ({ message: 'Secure Job Application API is running' });
})

app.listen(3000, () => {
  console.log('Server is running on port http://localhost:3000');
});