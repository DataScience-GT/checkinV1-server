
let transporter = nodemailer.createTransport({
       host: 'smtp.ionos.com',
       port: 587,
       auth: {
           user: "hello@hacklytics2022.com",
           pass: "w2*jU?]@v?pRJ]n"
       }
})

message = {
    from: "hello@hacklytics2022.com",
    to: "rambergerjohn@gmail.com",
    subject: "test90304",
    text: "Hello SMTP Email"
}
transporter.sendMail(message, function(err, info) {
    if (err) {
      console.log(err)
    } else {
      console.log(info);
    }
});
