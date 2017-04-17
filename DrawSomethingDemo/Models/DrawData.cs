using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace DrawSomethingDemo.Models
{
  public class Stroke
  {
    public int strokeId { get; set; }
    public string color { get; set; }
    public Point[] points { get; set; }
  }

  public class Point {
    public short x { get; set; }
    public short y { get; set; }
  }
}