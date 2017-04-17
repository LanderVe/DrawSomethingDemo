/// <reference path="rx.all.js" />

$(function () {
  //get canvas and context
  let mineCanvas = document.getElementById('mine');
  let mineContext = mineCanvas.getContext('2d');
  let othersCanvas = document.getElementById('others');
  let othersContext = othersCanvas.getContext('2d');
  let colorInput = document.getElementById('colorPicker');

  //subjects
  let drawFromServer$ = new Rx.Subject();

  // Declare a proxy to reference the hub. 
  let drawHub = $.connection.drawHub;

  drawHub.client.drawFromServer = function (drawData) {
    drawFromServer$.onNext(drawData);
  };

  function drawOthers(strokes) {
    //erase previous
    othersCanvas.width = othersCanvas.width;
    strokes.forEach(stroke => drawStrokeOthers(stroke));
  };

  function drawStrokeOthers(stroke) {
    if (!stroke.points || stroke.points.length == 0) { return; }

    othersContext.beginPath();
    othersContext.strokeStyle = stroke.color;

    //process first point
    othersContext.moveTo(stroke.points[0].x, stroke.points[0].y);

    //process other points
    for (let i = 1; i < stroke.points.length; i++) {
      let curr = stroke.points[i];
      othersContext.lineTo(curr.x, curr.y);
    }

    othersContext.stroke();
    othersContext.closePath();
  }

  function drawLineMine(x, y, isNewStroke, color) {
    if (isNewStroke) {
      mineContext.closePath(); //close previous path
      mineContext.beginPath();
      mineContext.strokeStyle = color;
      mineContext.moveTo(x, y);
    }
    else {
      mineContext.lineTo(x, y);
      mineContext.stroke();
    }
  }



  // Start the connection.
  $.connection.hub.start().done(function () {

    let mousemove$ = Rx.Observable.fromEvent(mineCanvas, 'mousemove');
    let mousedown$ = Rx.Observable.fromEvent(mineCanvas, 'mousedown');
    let mouseup$ = Rx.Observable.fromEvent(document, 'mouseup');
    let colorChange$ = Rx.Observable.fromEvent(colorInput, 'change');

    //returns false if up, a strokeId when down, the strokeId is incremented with every new down
    let ismousedown$ = Rx.Observable.merge(mousedown$.scan((prev, e) => prev + 1, 0), mouseup$.map(e => false));
    let color$ = colorChange$.map(e => e.target.value).startWith('#000000');

    let mappedMouseMove$ = mousemove$.withLatestFrom(ismousedown$, color$,
      (e, strokeId, color) => strokeId ? { x: e.offsetX, y: e.offsetY, strokeId: strokeId, color: color } : null);

    //draw local
    let localSub = mappedMouseMove$
      .filter(strokeElement => !!strokeElement)
      .startWith({ strokeId: -1 })
      .bufferWithCount(2, 1) //sliding buffer to figure out if this is a new stroke
      .subscribe(([prev, curr]) => {
        let isNewStroke = curr.strokeId !== prev.strokeId;
        drawLineMine(curr.x, curr.y, isNewStroke, curr.color);
      });

    //send to server
    let sendToServerSub = mappedMouseMove$
      //.filter(val => !!val)
      //.bufferWithCount(100)
      //.bufferWithTime(500)
      //.bufferWithTimeOrCount(500, 100)
      .buffer(ismousedown$.filter(val => !!val), () => ismousedown$.filter(val => !val))
      .subscribe(buff => {
        if (buff.length > 0) {
          let points = buff.filter(el => !!el).map(el => { return { x: el.x, y: el.y } });
          drawHub.server.send({ points: points, color: buff[0].color, strokeId: buff[0].strokeId });
        }
      });

    //receive from sever
    drawFromServer$
      .scan((strokes, newStroke) => strokes.concat(newStroke), [])
      .subscribe(data => drawOthers(data));

  });

});