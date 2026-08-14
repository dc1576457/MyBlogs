import ConversionHistory from "../models/ConversionHistory.js";
import { User } from "../models/User.js";



// Helper: Convert Postman JSON to cURL
export const parsePostmanToCurl = (parsed, isMultiline = true) => {
  let request = parsed;

  if (parsed.item && Array.isArray(parsed.item)) {
    const findRequest = (items) => {
      for (let item of items) {
        if (item.request) return item.request;
        if (item.item) {
          const nested = findRequest(item.item);
          if (nested) return nested;
        }
      }
      return null;
    };
    request = findRequest(parsed.item) || parsed;
  } else if (parsed.request) {
    request = parsed.request;
  }

  const method = (request.method || "GET").toUpperCase();

  let url = "";
  if (typeof request.url === "string") {
    url = request.url;
  } else if (request.url && typeof request.url === "object") {
    url = request.url.raw || "";
    if (!url && request.url.host) {
      const protocol = request.url.protocol ? `${request.url.protocol}://` : "https://";
      const host = Array.isArray(request.url.host) ? request.url.host.join(".") : request.url.host;
      const path = Array.isArray(request.url.path) ? "/" + request.url.path.join("/") : "";
      url = `${protocol}${host}${path}`;
    }
  }

  if (!url) {
    throw new Error("Valid URL not found in Postman JSON.");
  }

  const parts = [`curl --location${method !== "GET" ? ` --request ${method}` : ""}`];
  parts.push(`'${url}'`);

  const headers = [];
  if (Array.isArray(request.header)) {
    request.header.forEach((h) => {
      if (!h.disabled && h.key) {
        headers.push(`--header '${h.key}: ${h.value || ""}'`);
      }
    });
  } else if (request.header && typeof request.header === "object") {
    Object.entries(request.header).forEach(([key, value]) => {
      headers.push(`--header '${key}: ${value}'`);
    });
  }

  if (request.auth) {
    if (request.auth.type === "bearer" && request.auth.bearer) {
      const bearerObj = Array.isArray(request.auth.bearer)
        ? request.auth.bearer.find((b) => b.key === "token")
        : request.auth.bearer;
      if (bearerObj && bearerObj.value) {
        headers.push(`--header 'Authorization: Bearer ${bearerObj.value}'`);
      }
    } else if (request.auth.type === "basic" && request.auth.basic) {
      let user = "", pass = "";
      if (Array.isArray(request.auth.basic)) {
        user = request.auth.basic.find((b) => b.key === "username")?.value || "";
        pass = request.auth.basic.find((b) => b.key === "password")?.value || "";
      }
      if (user || pass) {
        const token = Buffer.from(`${user}:${pass}`).toString("base64");
        headers.push(`--header 'Authorization: Basic ${token}'`);
      }
    }
  }

  parts.push(...headers);

  if (request.body) {
    const mode = request.body.mode;
    if (mode === "raw" && request.body.raw) {
      const escapedRaw = request.body.raw.replace(/'/g, "'\\''");
      parts.push(`--data-raw '${escapedRaw}'`);
    } else if (mode === "urlencoded" && Array.isArray(request.body.urlencoded)) {
      request.body.urlencoded.forEach((item) => {
        if (!item.disabled && item.key) {
          parts.push(`--data-urlencode '${item.key}=${item.value || ""}'`);
        }
      });
    } else if (mode === "formdata" && Array.isArray(request.body.formdata)) {
      request.body.formdata.forEach((item) => {
        if (!item.disabled && item.key) {
          if (item.type === "file") {
            parts.push(`--form '${item.key}=@${item.src || "path/to/file"}'`);
          } else {
            parts.push(`--form '${item.key}=${item.value || ""}'`);
          }
        }
      });
    }
  }

  const joiner = isMultiline ? " \\\n  " : " ";
  return {
    curl: parts.join(joiner),
    method,
    url,
  };
};

// 1. Proxy API Execution Engine (Bypasses Browser CORS Restrictions)
export const proxyExecuteRequest = async (req, res) => {
  const startTime = Date.now();
  try {
    const { method = "GET", url, headers = {}, bodyMode = "none", rawBody = "" } = req.body;

    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: { ...headers },
    };

    if (method !== "GET" && method !== "HEAD" && bodyMode === "json" && rawBody) {
      fetchOptions.body = rawBody;
    }

    const apiResponse = await fetch(url, fetchOptions);
    const endTime = Date.now();
    const timeTaken = endTime - startTime;

    const responseText = await apiResponse.text();
    let responseData = responseText;
    const responseSize = Buffer.byteLength(responseText, "utf8");

    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      // Keep as text/html
    }

    const resHeaders = {};
    apiResponse.headers.forEach((val, key) => {
      resHeaders[key] = val;
    });

    return res.status(200).json({
      success: true,
      status: apiResponse.status,
      statusText: apiResponse.statusText || (apiResponse.ok ? "OK" : "Error"),
      ok: apiResponse.ok,
      time: timeTaken,
      size: (responseSize / 1024).toFixed(2) + " KB",
      data: responseData,
      headers: resHeaders,
    });
  } catch (error) {
    const endTime = Date.now();
    return res.status(200).json({
      success: false,
      status: 0,
      statusText: "Network / Connection Error",
      ok: false,
      time: endTime - startTime,
      size: "0 KB",
      data: {
        error: "Failed to execute API request via proxy.",
        message: error.message,
      },
      headers: {},
    });
  }
};

// 2. Convert Postman JSON Endpoint
export const convertPostmanToCurl = async (req, res) => {
  try {
    const { postmanJson, multiline = true } = req.body;

    if (!postmanJson) {
      return res.status(400).json({ message: "Please provide postmanJson payload." });
    }

    let parsedJson = typeof postmanJson === "string" ? JSON.parse(postmanJson) : postmanJson;
    const result = parsePostmanToCurl(parsedJson, multiline);

    return res.status(200).json({
      success: true,
      curl: result.curl,
      method: result.method,
      url: result.url,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid Postman JSON format.",
    });
  }
};

// 3. Save Request to History
export const saveConversion = async (req, res) => {
  try {
    const { title, method, url, headers, params, bodyMode, rawBody, curlOutput, postmanJson } = req.body;

    if (!url) {
      return res.status(400).json({ message: "URL is required to save request." });
    }

    const newRecord = await ConversionHistory.create({
      userId: req.user ? (req.user._id || req.user.id || req.user.userId) : null,
      title: title || `${method} - ${url.substring(0, 30)}...`,
      method: method || "GET",
      url,
      headers: headers || [],
      params: params || [],
      bodyMode: bodyMode || "none",
      rawBody: rawBody || "",
      curlOutput: curlOutput || "",
      postmanJson: postmanJson || null,
    });

    return res.status(201).json({
      success: true,
      message: "Request saved to history successfully!",
      data: newRecord,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Get History (Public/User)
export const getHistory = async (req, res) => {
  try {
    const history = await ConversionHistory.find().sort({ createdAt: -1 }).limit(20);
    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Delete History Item
export const deleteHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    await ConversionHistory.findByIdAndDelete(id);
    return res.status(200).json({ success: true, message: "History item deleted." });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};



// ======================================================
// @desc    Get Admin Conversion History (With User Filter & Deep Search)
// @route   GET /api/convert/admin/history
// @access  Protected / Admin
// ======================================================
export const getAdminConversionHistory = async (req, res) => {
  try {
    // Sirf Admin access
    if (!req.user || req.user.role?.toLowerCase() !== "admin") {
      return res.status(404).json({
        success: false,
        message: "API route not found.",
      });
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search?.trim() || "";
    const method = req.query.method?.trim() || "";
    const filterUserId = req.query.userId?.trim() || "";

    const query = {};

    // 1. Filter by specific User ID if provided
    if (filterUserId && filterUserId !== "ALL") {
      if (filterUserId === "GUEST") {
        query.userId = null;
      } else {
        query.userId = filterUserId;
      }
    }

    // 2. Filter by HTTP Method
    if (method && method !== "ALL") {
      query.method = method.toUpperCase();
    }

    // 3. Search by URL, Title, or User's Name/Email
    if (search) {
      const matchingUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");

      const userIds = matchingUsers.map((u) => u._id);

      query.$or = [
        { url: { $regex: search, $options: "i" } },
        { title: { $regex: search, $options: "i" } },
        { userId: { $in: userIds } },
      ];
    }

    const total = await ConversionHistory.countDocuments(query);

    const history = await ConversionHistory.find(query)
      .populate("userId", "name email role createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Get list of distinct registered users for the filter dropdown
    const registeredUsers = await User.find({}).select("name email role").sort({ name: 1 });

    return res.status(200).json({
      success: true,
      count: history.length,
      totalPages: Math.ceil(total / limit) || 1,
      currentPage: page,
      totalEntries: total,
      usersList: registeredUsers,
      history,
    });
  } catch (error) {
    console.error("Get Admin History Error:", error);
    return res.status(404).json({
      success: false,
      message: "API route not found.",
    });
  }
};

// Delete single history item
export const deleteConversionHistory = async (req, res) => {
  try {
    if (!req.user || req.user.role?.toLowerCase() !== "admin") {
      return res.status(404).json({
        success: false,
        message: "API route not found.",
      });
    }

    const { id } = req.params;
    const history = await ConversionHistory.findByIdAndDelete(id);

    if (!history) {
      return res.status(404).json({
        success: false,
        message: "History entry not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "History entry deleted successfully",
    });
  } catch (error) {
    console.error("Delete History Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to delete history item",
    });
  }
};