import { assertDevBranch } from "../prisma/branch-guard";

// Runs before every test file, so nothing can touch a database that isn't dev.
assertDevBranch("run tests");
