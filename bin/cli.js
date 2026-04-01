#!/usr/bin/env node
"use strict";

require("dotenv").config();
require("dotenv").config({ path: ".env.local", override: true });

const { run } = require("../lib/run");

run().catch(err => {
  console.error(err?.message || err);
  process.exit(1);
});
