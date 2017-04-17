using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Microsoft.AspNet.SignalR;
using DrawSomethingDemo.Models;

namespace DrawSomethingDemo.Hubs
{
  public class DrawHub : Hub
  {
    public void Send(Stroke data)
    {
      // heavy processing, use your imagination

      Clients.Others.drawFromServer(data);
    }

  }
}