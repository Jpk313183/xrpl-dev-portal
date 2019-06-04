const commandlist = $("#command_list")
const request_body = $(".request-body.io")
const response_body = $(".response-body.io")
const request_button  = $('.request_button')
const conn_btn = $(".connection")

const GET = "GET"
const POST = "POST"
const PUT = "PUT"
const DELETE = "DELETE"

function slugify(str) {
  str = str.replace(/^\s+|\s+$/g, '') // trim
  str = str.toLowerCase()

  // remove accents, swap ñ for n, etc
  const from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;"
  const to   = "aaaaeeeeiiiioooouuuunc------"
  for (let i=0, l=from.length ; i<l ; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i))
  }

  str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
}

//Build requests
const requests = { };
const requestlist = [];
function Request(name, obj) {
    if (obj === undefined) {
        requestlist.push({slug: null,name: name});//separator
        return null;
    }

    obj.name = name;
    obj.slug = slugify(name);
    requests[obj.slug] = obj;
    requestlist.push(obj);

    return obj;
};

function generate_table_of_contents() {
  $.each(requestlist, function(i, req) {
    if (req.slug === null) {
        commandlist.append("<li class='separator'>"+req.name+"</li>");
    } else {
        commandlist.append("<li class='method'><a href='#"+req.slug+"'>"+req.name+"</a></li>");
    }
  });
}

function make_commands_clickable() {
    commandlist.children("li").click(function() {
        var cmd = slugify($(this).text().trim());

        if (!requests[cmd]) return;

        select_request(cmd, true);
        window.location.hash = cmd;

        $(this).siblings().removeClass('selected');
        $(this).addClass('selected');
    });
}

const cm_request = CodeMirror(request_body.get(0), {
  mode: 'javascript',
  json: true,
  smartIndent: false
})

const cm_response = CodeMirror(response_body.get(0), {
  mode: 'javascript',
  json: true,
  smartIndent: false,
  readOnly: true
})

function select_request(request) {
  if (request === undefined) {
    var el = commandlist.children("li:not(.separator)").eq(0)
    request = slugify(el.text())
  } else {
    var el = commandlist.find("li a[href='#"+request+"']").parent()
  }
  $(el).siblings().removeClass('selected');
  $(el).addClass('selected');

  command = requests[request];

  if (command.description) {
    $(".api-method-description-wrapper .blurb").html(command.description)
    $(".api-method-description-wrapper .blurb").show()
  } else {
    $(".api-method-description-wrapper .blurb").hide()
  }
  if (command.link) {
    $(".api-method-description-wrapper .api-readmore").attr("href", command.link)
    $(".api-method-description-wrapper .api-readmore").show()
  } else {
    $(".api-method-description-wrapper .api-readmore").hide()
  }

  $(".selected_command").attr('href', command.link).text(command.name)

  if (command.hasOwnProperty("body")) {
      cm_request.setValue(JSON.stringify(command.body, null, 2));
  } else {
      //No body, so wipe out the current contents.
      cm_request.setValue("");
  }
  cm_request.refresh();

  reset_response_area();
};

function reset_response_area() {
    cm_response.setValue("");
}

function send_request() {
  // TODO: send
}

let socket;
function connect_socket() {
  $(".connect-loader").show()
  const selected_server_el = $("input[name='wstool-1-connection']:checked")
  const conn_url = selected_server_el.val()
  socket = new WebSocket(conn_url)

  socket.addEventListener('open', (event) => {
    conn_btn.text(selected_server_el.data("shortname") + " (Connected)")
    conn_btn.removeClass("btn-outline-secondary")
    conn_btn.removeClass("btn-danger")
    conn_btn.addClass("btn-success")
    $(".connect-loader").hide()
  })
  socket.addEventListener('close', (event) => {
    if (event.wasClean) {
      console.log("socket clean:", event)
      conn_btn.text(selected_server_el.data("shortname") + " (Not Connected)")
      conn_btn.removeClass("btn-success")
      conn_btn.removeClass("btn-danger")
      conn_btn.addClass("btn-outline-secondary")
      $(".connect-loader").hide()
    }
  })
  socket.addEventListener('error', (event) => {
    console.error("socket error:", event)
    conn_btn.text(selected_server_el.data("shortname") + " (Failed to Connect)")
    conn_btn.removeClass("btn-outline-secondary")
    conn_btn.removeClass("btn-success")
    conn_btn.addClass("btn-danger")
    $(".connect-loader").hide()
  })
  socket.addEventListener('message', (event) => {
    // TODO: send to dispatcher?
  })
}

handle_select_server = function(event) {
  if (typeof socket !== "undefined") { socket.close(1000) }
  connect_socket()
}
// TODO: more stuff



$(document).ready(function() {
    //wait for the Requests to be populated by another file
    generate_table_of_contents();
    make_commands_clickable();

    if (window.location.hash) {
      var cmd   = window.location.hash.slice(1).toLowerCase();
      select_request(cmd);
    } else {
      select_request();
    }

    // TODO: permalink stuff here?
    // if (urlParams["base_url"]) {
    //   //TODO: change_base_url(urlParams["base_url"]);
    // }

    connect_socket()

    request_button.click(send_request);
    $("input[name='wstool-1-connection']").click(handle_select_server)

});

var urlParams;
(window.onpopstate = function () {
    var match,
        pl     = /\+/g,  // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    urlParams = {};
    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
})();
