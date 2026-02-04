/*----------------------------------------------   
 -Simple Scroll To Anchor
 -----------------------------------------------  */
$("a[data-scroll]").click(function (e) {
  e.preventDefault();
  //Set Offset Distance from top to account for fixed nav
  var offset = 10;
  var target = "#" + $(this).data("scroll");
  var $target = $(target);
  //Animate the scroll to, include easing lib if you want more fancypants easings
  $("html, body")
    .stop()
    .animate(
      {
        scrollTop: $target.offset().top - offset,
      },
      800,
      "swing"
    );
});
