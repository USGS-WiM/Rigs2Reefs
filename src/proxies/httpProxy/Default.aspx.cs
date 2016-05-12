// 04.07.14 - NE - proxy service to mask mail service request to wim.usgs.gov from app when local or in AWS

using System;
using System.Configuration;
using System.Collections;
using System.Data;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;
using System.Data.SqlClient;

namespace httpProxy
{
    public partial class _Default : System.Web.UI.Page
    {
        protected void Page_Load(object sender, EventArgs e)
        {
            if (Request.QueryString["to"] != null && Request.QueryString["to"] != "")
            {
                string to = Request.QueryString["to"];
                string subject = Request.QueryString["subject"];
                string body = Request.QueryString["body"];
                string url = "";

                Uri referrerUri = Request.UrlReferrer;
                
                //url = "http://localhost/apps/proxies/mailService/Default.aspx?from=no-reply@bsee.gov&to="+to+"&subject="+subject+"&body="+body;
                url = "http://wim.usgs.gov/BSEE/mailService/Default.aspx?from=no-reply@bsee.gov&to="+to+"&subject="+subject+"&body="+body+"&referrer="+referrerUri.ToString();

                HttpWebRequest wsRequest = (HttpWebRequest)WebRequest.Create(url);

                wsRequest.Method = "GET";

                HttpWebResponse wsResponse = (HttpWebResponse)wsRequest.GetResponse();

                string responseStatus = wsResponse.StatusCode.ToString();

                System.IO.StreamReader str = new System.IO.StreamReader(wsResponse.GetResponseStream());

                Response.Write(str.ReadToEnd());
                str.Close();
            }
        }
    }
}
