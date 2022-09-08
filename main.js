/* Pixel art to ANSI art converter
 * TODO: display image in page
 * TODO: auto recognize dot size
 */


var input = document.getElementById("imgfile");
var code_box = document.getElementById("code");
var copy_button = document.getElementById("copy_button");
var mainForm = document.getElementById("main_form");
var dotsize_auto = document.getElementById("dotsize_auto");
var dotsize_user = document.getElementById("dotsize_user");

var auto_dotsize = "";
var image_data = null;

input.addEventListener("change", function (event) {
    var file = event.target.files;
    var reader = new FileReader();
    var bigImg = document.getElementById("pixeldisplay");

    syncResizeMode();

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


            image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);

            auto_dotsize = guessPixelSize(image_data);

            document.getElementById("img_size").innerText = `${img.width}x${img.height} px`;
            document.getElementById("guessed_dot_size").innerText = `${auto_dotsize} px`
            mainForm.px_size.value = auto_dotsize;
        }
    }
}, false);

mainForm.addEventListener("submit", (event) => {
    if (!image_data) {
        event.preventDefault();
        return;
    };

    const dotsize = mainForm.px_size.value;

    var colorMode = mainForm.cmode.value;
    console.log(colorMode);

    var ansi_code;
    switch (colorMode) {
        case "24bit":
            ansi_code = cov24bitansicode(image_data, "  ", dotsize);
            break;
        case "8bit":
            ansi_code = cov8bitansicode(image_data, "  ", dotsize);
            break;
    }

    code_box.value = 'echo -e "' + ansi_code + '"\n';

    event.preventDefault();
});

copy_button.addEventListener("click", function (event) {
    navigator.clipboard.writeText(code_box.value);
    message = document.getElementById("copy_ok_message");
    message.style.opacity = 1;
    setTimeout(function () { message.style.opacity = 0; }, 800)
}, false)

dotsize_auto.addEventListener("change", (event) =>
    syncResizeMode()
);

dotsize_user.addEventListener("change", (event) =>
    syncResizeMode()
);

const syncResizeMode = (event) => {
    switch (mainForm.resize_mode.value) {
        case "auto":
            mainForm.px_size.readOnly = true;
            mainForm.px_size.value = auto_dotsize;
            break;
        case "user":
            mainForm.px_size.readOnly = false;
            break;
    }
};

var guessPixelSize = (data) => {
    colors = data.data;
    bc = -1;
    pxsize = 1;
    pxsizes = new Set();
    console.log(colors.length / 4);
    for (var i = 0; i < colors.length / 4; i++) {
        ci = i * 4;
        c = (colors[ci] * 0x10000) + (colors[ci + 1] * 0x100) + colors[ci + 2];
        if (i % data.width == 0) {
            pxsize = 1;
            bc = c;
            continue;
        }

        if (bc === c) {
            pxsize++;
        } else {
            // console.log(`end at ${i} px ${pxsize} diff ${bc-c}`);
            pxsizes.add(pxsize);
            if (pxsize === 1) {
                break;
            }
            pxsize = 1;
        }
        bc = c;
    }
    console.log(pxsizes);
    return gcd_array(Array.from(pxsizes));
}

var cov24bitansicode = function (data, dotchar, dotsize = 1) {
    const grid_offset = Math.floor(dotsize / 2);
    var dotsize = Math.max(dotsize, 1);
    var ansi_code = "";
    for (var y = 0; y < data.height; y += dotsize) {
        var oldCode = null;
        for (var x = 0; x < data.width; x += dotsize) {
            var idx = (grid_offset + x + y * data.width) * 4;
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
            // console.log(oldCode === code);
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

var cov8bitansicode = function (data, dotchar, dotsize = 1) {

    var c256to6 = function (num) {
        //console.log(num)
        br = [48, 115, 155, 195, 235, 255];
        for (let i = 0; i < br.length; i++) {
            if (num <= br[i]) {
                return i;
            }
        }
        console.log("Error: c256to6");
        return 5;
    }

    const grid_offset = Math.floor(dotsize / 2);
    var dotsize = Math.max(dotsize, 1);
    var ansi_code = "";
    for (var y = 0; y < data.height; y += dotsize) {
        var oldCode = null;
        for (var x = 0; x < data.width; x += dotsize) {
            var idx = (grid_offset + x + y * data.width) * 4;
            var code;
            if (data.data[idx + 3] <= 16) {
                code = "\\033[0m" + dotchar;
            } else {
                var num = c256to6(data.data[idx]) * 36   //R
                    + c256to6(data.data[idx + 1]) * 6    //G
                    + c256to6(data.data[idx + 2]) * 1    //B
                    + 16;
                code = "\\033[48;5;"
                    + num + "m"
                    + dotchar;
            }
            //console.log(oldCode === code);
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

var gcd = (x, y) => {
    if (y == 0) {
        return x;
    }
    return gcd(y, x % y);
}

var gcd_array = (a) => {
    return a.reduce((p, c) => gcd(p, c));
}
