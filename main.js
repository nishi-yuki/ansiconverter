/* Pixel art to ANSI art converter
 * TODO: display image in page
 * TODO: auto recognize dot size
 */


const input = document.getElementById("imgfile");
const code_box = document.getElementById("code");
const copy_button = document.getElementById("copy_button");
const main_form = document.getElementById("main_form");
const dotsize_auto = document.getElementById("dotsize_auto");
const dotsize_user = document.getElementById("dotsize_user");

var auto_dotsize = "";
var image_data = null;

input.addEventListener("change", (event) => {
    const file = event.target.files;
    const reader = new FileReader();
    const bigImg = document.getElementById("pixeldisplay");

    syncResizeMode();

    reader.readAsDataURL(file[0]);

    reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.src = dataUrl;
        bigImg.src = dataUrl;

        img.onload = () => {
            const canvas = document.getElementById("canvas");
            const ctx = canvas.getContext("2d");
            const canvas_size = 256;
            const n = canvas_size / img.width;
            console.log(canvas_size + "/" + img.width + "=" + n);

            const width = Math.ceil(img.width * n);
            const height = Math.ceil(img.height * n);
            console.log("width:\t" + width);
            console.log("height:\t" + height);

            canvas.width = img.width;
            canvas.height = img.height;

            // ctx.drawImage(img, 0, 0, width, height);
            ctx.drawImage(img, 0, 0);


            image_data = ctx.getImageData(0, 0, canvas.width, canvas.height);

            auto_dotsize = guessDotSize(image_data);

            document.getElementById("img_size").innerText = `${img.width}x${img.height} px`;
            document.getElementById("guessed_dot_size").innerText = `${auto_dotsize} px`
            main_form.px_size.value = auto_dotsize;
        }
    }
}, false);

main_form.addEventListener("submit", (event) => {
    if (!image_data) {
        event.preventDefault();
        return;
    };

    const dotsize = main_form.px_size.value;

    const colorMode = main_form.cmode.value;
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

copy_button.addEventListener("click", (event) => {
    navigator.clipboard.writeText(code_box.value);
    message = document.getElementById("copy_ok_message");
    message.style.opacity = 1;
    setTimeout(() => { message.style.opacity = 0; }, 800)
}, false)

dotsize_auto.addEventListener("change", (event) =>
    syncResizeMode()
);

dotsize_user.addEventListener("change", (event) =>
    syncResizeMode()
);

const syncResizeMode = (event) => {
    switch (main_form.resize_mode.value) {
        case "auto":
            main_form.px_size.readOnly = true;
            main_form.px_size.value = auto_dotsize;
            break;
        case "user":
            main_form.px_size.readOnly = false;
            break;
    }
};

const guessDotSize = (data) => {
    cmp_clr = (x1, y1, x2, y2) => {
        i1 = (x1 + y1 * data.width) * 4;
        i2 = (x2 + y2 * data.width) * 4;
        return data.data[i1] == data.data[i2] &&
            data.data[i1 + 1] == data.data[i2 + 1] &&
            data.data[i1 + 2] == data.data[i2 + 2];
    };

    a = new Set();

    count = 1;
    for (var x = 1; x < data.width; x++) {
        same = true;
        for (var y = 0; y < data.height; y += 2) {
            if (!cmp_clr(x - 1, y, x, y)) {
                same = false;
                break;
            }
        }
        if (same) {
            count++;
        } else {
            a.add(count);
            count = 1;
        }
    }
    a.add(count);
    console.log(a);

    count = 1;
    for (var y = 1; y < data.width; y++) {
        same = true;
        for (var x = 0; x < data.height; x += 2) {
            if (!cmp_clr(x, y - 1, x, y)) {
                same = false;
                break;
            }
        }
        if (same) {
            count++;
        } else {
            a.add(count);
            count = 1;
        }
    }
    a.add(count);
    console.log(a);

    return gcd_array(Array.from(a));
};

const cov24bitansicode = (data, dotchar, dotsize = 1) => {
    const dot_size = Math.max(dotsize, 1);
    const grid_offset = Math.floor(dot_size / 2);
    var ansi_code = "";
    for (var y = 0; y < data.height; y += dot_size) {
        var oldCode = null;
        for (var x = 0; x < data.width; x += dot_size) {
            const idx = (grid_offset + x + y * data.width) * 4;
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

const cov8bitansicode = (data, dotchar, dotsize = 1) => {

    const c256to6 = (num) => {
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

    const dot_size = Math.max(dotsize, 1);
    const grid_offset = Math.floor(dot_size / 2);
    var ansi_code = "";
    for (var y = 0; y < data.height; y += dot_size) {
        var oldCode = null;
        for (var x = 0; x < data.width; x += dot_size) {
            const idx = (grid_offset + x + y * data.width) * 4;
            var code;
            if (data.data[idx + 3] <= 16) {
                code = "\\033[0m" + dotchar;
            } else {
                const num = c256to6(data.data[idx]) * 36   //R
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

const gcd = (x, y) => {
    if (y == 0) {
        return x;
    }
    return gcd(y, x % y);
}

const gcd_array = (a) => {
    return a.reduce((p, c) => gcd(p, c));
}
