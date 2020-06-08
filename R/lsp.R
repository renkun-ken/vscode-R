if (!requireNamespace("languageserver")) {
  install.packages("languageserver")
}

debug <- Sys.getenv("R_LSP_DEBUG") == "1"
port <- Sys.getenv("R_LSP_PORT")

if (nzchar(port)) {
  port <- as.integer(port)
} else {
  port <- NULL
}

languageserver::run(
  debug = debug,
  port = port)
