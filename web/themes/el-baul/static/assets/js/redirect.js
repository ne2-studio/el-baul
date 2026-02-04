$("document").ready(function () {
  $("form.redirect-js").each(function () {
    this.addEventListener(
      "submit",
      function (event) {
        event.preventDefault();

        window.location.href = this.dataset["redirect"];
      },
      true
    );
  });
});
