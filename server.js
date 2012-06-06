var connect = require('connect'),
    path = require('path');

module.exports = connect.createServer(
    connect.static(path.join(__dirname, 'public'))
);
