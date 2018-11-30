/* Pixel art to ANSI art converter
 * TODO: display image in page
 * TODO: auto recognize dot size
 */


var input = document.getElementById("imgfile");
var code_box = document.getElementById("code");

input.addEventListener("change", function (event) {
    var file = event.target.files;
    var reader = new FileReader();
    var bigImg = document.getElementById("pixeldisplay");

    reader.readAsDataURL(file[0]);

    reader.onload = function () {
        var dataUrl = reader.result;
        var img = new Image();
        img.src = dataUrl;
        bigImg.src = dataUrl;

        img.onload = function () {
            var canvas = document.getElementById("canvas");
            var ctx = canvas.getContext("2d");
            var canvas_size = 256;
            var n = canvas_size / img.width;
            console.log(canvas_size + "/" + img.width + "=" + n);

            var width = Math.ceil(img.width * n);
            var height = Math.ceil(img.height * n);
            console.log("width:\t" + width);
            console.log("height:\t" + height);

            canvas.width = img.width;
            canvas.height = img.height;

            // ctx.drawImage(img, 0, 0, width, height);
            ctx.drawImage(img, 0, 0);


            var data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            var ansi_code = cov24bitansicode(data, "  ");
            code_box.value = 'echo -e "' + ansi_code + '"\n';
        }
    }
}, false);

var cov24bitansicode = function (data, dotchar) {
    var ansi_code = "";
    for (var y = 0; y < data.height; y++) {
        var oldCode = null;
        for (var x = 0; x < data.width; x++) {
            var idx = (x + y * data.width) * 4;
            var code;
            if (data.data[idx + 3] <= 16) {
                code = "\\033[0m" + dotchar;
            } else {
                code = "\\033[48;2;"
                    + data.data[idx] + ";"    //R
                    + data.data[idx + 1] + ";"    //G
                    + data.data[idx + 2] + "m"   //B
                    + dotchar;
            }
            console.log(oldCode === code);
            if (oldCode === code) {
                ansi_code += dotchar;
            } else {
                ansi_code += code;
            }
            oldCode = code;
        }
        ansi_code += "\\033[0m"
        if (y < data.height - 1) {
            ansi_code += "\\n";
        }
    }
    return ansi_code;
}
