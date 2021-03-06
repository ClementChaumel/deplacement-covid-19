import "bootstrap/dist/css/bootstrap.min.css";

import "./main.css";

import { PDFDocument, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import cookie from "cookie";
import { library, dom } from "@fortawesome/fontawesome-svg-core";
import { faEye, faFilePdf } from "@fortawesome/free-solid-svg-icons";

import { $, $$ } from "./dom-utils";
import pdfBase from "./certificate.pdf";

library.add(faEye, faFilePdf);

dom.watch();

const generateQR = async (text) => {
  try {
    var opts = {
      errorCorrectionLevel: "M",
      type: "image/png",
      quality: 0.92,
      margin: 1,
    };
    return await QRCode.toDataURL(text, opts);
  } catch (err) {
    console.error(err);
  }
};

function prepop() {
  const cookies = cookie.parse(document.cookie);
  console.log({ cookies });
  if (cookies.firstname) $("#field-firstname").value = cookies.firstname;
  if (cookies.lastname) $("#field-lastname").value = cookies.lastname;
  if (cookies.birthday) $("#field-birthday").value = cookies.birthday;
  if (cookies.lieunaissance)
    $("#field-lieunaissance").value = cookies.lieunaissance;
  if (cookies.address) $("#field-address").value = cookies.address;
  if (cookies.town) $("#field-town").value = cookies.town;
  if (cookies.zipcode) $("#field-zipcode").value = cookies.zipcode;
}

document.addEventListener("DOMContentLoaded", prepop);

function saveProfile() {
  for (const field of $$("#form-profile input")) {
    console.log(`${field.name} : ${field.value}`);
    document.cookie = cookie.serialize(field.name, field.value, {
      maxAge: 7884000,
    });
    localStorage.setItem(field.id.substring("field-".length), field.value);
  }
}

function getProfile() {
  const fields = {};
  for (let i = 0; i < localStorage.length; i++) {
    const name = localStorage.key(i);
    fields[name] = localStorage.getItem(name);
  }
  return fields;
}

function idealFontSize(font, text, maxWidth, minSize, defaultSize) {
  let currentSize = defaultSize;
  let textWidth = font.widthOfTextAtSize(text, defaultSize);

  while (textWidth > maxWidth && currentSize > minSize) {
    textWidth = font.widthOfTextAtSize(text, --currentSize);
  }

  return textWidth > maxWidth ? null : currentSize;
}

async function generatePdf(profile) {
  const creationDate = new Date().toLocaleDateString("fr-FR");
  const now = new Date();
  const offset = 60000 * (Math.floor(Math.random() * 15) + 10);
  const creationHour = new Date(now - offset)
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "h");

  const {
    lastname,
    firstname,
    birthday,
    lieunaissance,
    address,
    zipcode,
    town,
  } = profile;
  const releaseHours = String(creationHour).substring(0, 2);
  const releaseMinutes = String(creationHour).substring(3, 5);

  const data = [
    `Cree le: ${creationDate} a ${creationHour}`,
    `Nom: ${lastname}`,
    `Prenom: ${firstname}`,
    `Naissance: ${birthday} a ${lieunaissance}`,
    `Adresse: ${address} ${zipcode} ${town}`,
    `Sortie: ${creationDate} a ${releaseHours}h${releaseMinutes}`,
    "Motifs: sport",
  ].join("; ");

  const existingPdfBytes = await fetch(pdfBase).then((res) =>
    res.arrayBuffer()
  );

  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const page1 = pdfDoc.getPages()[0];

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const drawText = (text, x, y, size = 11) => {
    page1.drawText(text, { x, y, size, font });
  };

  drawText(`${firstname} ${lastname}`, 123, 686);
  drawText(birthday, 123, 661);
  drawText(lieunaissance, 92, 638);
  drawText(`${address} ${zipcode} ${town}`, 134, 613);
  // if (reasons.includes("sport")) {
  drawText("x", 76, 345, 19);
  // }
  let locationSize = idealFontSize(font, profile.town, 83, 7, 11);

  if (!locationSize) {
    alert(
      "Le nom de la ville risque de ne pas être affiché correctement en raison de sa longueur. " +
        'Essayez d\'utiliser des abréviations ("Saint" en "St." par exemple) quand cela est possible.'
    );
    locationSize = 7;
  }

  drawText(profile.town, 111, 226, locationSize);

  drawText(`${creationDate}`, 92, 200);
  drawText(releaseHours, 200, 201);
  drawText(releaseMinutes, 220, 201);

  // Date création
  drawText("Date de création:", 464, 150, 7);
  drawText(`${creationDate} à ${creationHour}`, 455, 144, 7);

  const generatedQR = await generateQR(data);

  const qrImage = await pdfDoc.embedPng(generatedQR);

  page1.drawImage(qrImage, {
    x: page1.getWidth() - 170,
    y: 155,
    width: 100,
    height: 100,
  });

  pdfDoc.addPage();
  const page2 = pdfDoc.getPages()[1];
  page2.drawImage(qrImage, {
    x: 50,
    y: page2.getHeight() - 350,
    width: 300,
    height: 300,
  });

  const pdfBytes = await pdfDoc.save();

  return new Blob([pdfBytes], { type: "application/pdf" });
}

function downloadBlob(blob, fileName) {
  const link = document.createElement("a");
  var url = URL.createObjectURL(blob);
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
}

// see: https://stackoverflow.com/a/32348687/1513045
function isFacebookBrowser() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return ua.includes("FBAN") || ua.includes("FBAV");
}

if (isFacebookBrowser()) {
  $("#alert-facebook").value =
    "ATTENTION !! Vous utilisez actuellement le navigateur Facebook, ce générateur ne fonctionne pas correctement au sein de ce navigateur ! Merci d'ouvrir Chrome sur Android ou bien Safari sur iOS.";
  $("#alert-facebook").classList.remove("d-none");
}

function addSlash() {
  $("#field-birthday").value = $("#field-birthday").value.replace(
    /^(\d{2})$/g,
    "$1/"
  );
  $("#field-birthday").value = $("#field-birthday").value.replace(
    /^(\d{2})\/(\d{2})$/g,
    "$1/$2/"
  );
  $("#field-birthday").value = $("#field-birthday").value.replace(/\/\//g, "/");
}

$("#field-birthday").onkeyup = function () {
  const key = event.keyCode || event.charCode;
  if (key === 8 || key === 46) {
    return false;
  } else {
    addSlash();
    return false;
  }
};

const snackbar = $("#snackbar");

const handleClick = async (event) => {
  event.preventDefault();

  saveProfile();
  const pdfBlob = await generatePdf(getProfile());
  localStorage.clear();
  const creationDate = new Date().toLocaleDateString("fr-CA");
  const creationHour = new Date()
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "-");
  downloadBlob(pdfBlob, `attestation-${creationDate}_${creationHour}.pdf`);

  snackbar.classList.remove("d-none");
  setTimeout(() => snackbar.classList.add("show"), 100);

  setTimeout(function () {
    snackbar.classList.remove("show");
    setTimeout(() => snackbar.classList.add("d-none"), 500);
  }, 6000);
};

$("#generate-btn").addEventListener("click", handleClick);
$("#generate-btn-2").addEventListener("click", handleClick);

const conditions = {
  "#field-firstname": {
    condition: "length",
  },
  "#field-lastname": {
    condition: "length",
  },
  "#field-birthday": {
    condition: "pattern",
    pattern: /^([0][1-9]|[1-2][0-9]|30|31)\/([0][1-9]|10|11|12)\/(19[0-9][0-9]|20[0-1][0-9]|2020)/g,
  },
  "#field-lieunaissance": {
    condition: "length",
  },
  "#field-address": {
    condition: "length",
  },
  "#field-town": {
    condition: "length",
  },
  "#field-zipcode": {
    condition: "pattern",
    pattern: /\d{5}/g,
  },
};

Object.keys(conditions).forEach((field) => {
  $(field).addEventListener("input", () => {
    if (conditions[field].condition == "pattern") {
      const pattern = conditions[field].pattern;
      if ($(field).value.match(pattern)) {
        $(field).setAttribute("aria-invalid", "false");
      } else {
        $(field).setAttribute("aria-invalid", "true");
      }
    }
    if (conditions[field].condition == "length") {
      if ($(field).value.length > 0) {
        $(field).setAttribute("aria-invalid", "false");
      } else {
        $(field).setAttribute("aria-invalid", "true");
      }
    }
  });
});
