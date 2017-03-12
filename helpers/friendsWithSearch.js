module.exports = function(first, last, searchTxt, options) {
    if (searchTxt && isMatching(first + ' ' + last, searchTxt)) {
        return options.fn(this);
    } else if (!searchTxt) {
        return options.fn(this);
    }
};

function isMatching(full, chunk) {
    if (full.toLowerCase().indexOf(chunk.toLowerCase()) > -1) {
        return true;
    }

    return false;
}
