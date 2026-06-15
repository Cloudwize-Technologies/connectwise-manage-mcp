import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { CwManageClient } from "../api-client.js";

function trimTimeEntry(t: Record<string, any>) {
  return {
    id: t.id,
    chargeToType: t.chargeToType,
    chargeToId: t.chargeToId,
    member: t.member?.identifier,
    company: t.company?.name,
    workType: t.workType?.name,
    workRole: t.workRole?.name,
    timeStart: t.timeStart,
    timeEnd: t.timeEnd,
    actualHours: t.actualHours,
    billableOption: t.billableOption,
    notes: t.notes,
  };
}

export function registerTimeEntryTools(server: McpServer, client: CwManageClient) {
  server.tool(
    "cw_search_time_entries",
    "Search time entries in ConnectWise Manage.",
    {
      conditions: z.string().optional().describe("ConnectWise conditions query string (e.g. \"member/identifier = 'jsmith'\")"),
      page: z.number().optional().describe("Page number (default: 1)"),
      pageSize: z.number().optional().describe("Results per page (default: 25, max: 100)"),
      orderBy: z.string().optional().describe("Field to order by"),
    },
    async ({ conditions, page, pageSize, orderBy }) => {
      const result = await client.get<Record<string, any>[]>("/time/entries", {
        conditions,
        page: page ?? 1,
        pageSize: pageSize ?? 25,
        orderBy,
      });
      const trimmed = Array.isArray(result) ? result.map(trimTimeEntry) : result;
      const returnedCount = Array.isArray(trimmed) ? trimmed.length : undefined;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            page: page ?? 1,
            pageSize: pageSize ?? 25,
            returnedCount,
            hasMore: returnedCount === (pageSize ?? 25),
            note: returnedCount === (pageSize ?? 25) ? "This page is full - more results may exist. Narrow your conditions or request the next page if needed" : undefined,
            results: trimmed,
          }, null, 2),
        }],
      };

      // return { content: [{ type: "text", text: JSON.stringify(trimmed, null, 2) }] };
    },
  );

  server.tool(
    "cw_get_time_entry",
    "Get a specific time entry by ID.",
    { id: z.number().describe("Time entry ID") },
    async ({ id }) => {
      const result = await client.get(`/time/entries/${id}`);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );

  server.tool(
    "cw_create_time_entry",
    "Create a new time entry.",
    {
      chargeToType: z.enum(["ServiceTicket", "ProjectTicket", "ChargeCode", "Activity"]).describe("What to charge the time to"),
      chargeToId: z.number().describe("ID of the ticket, charge code, or activity"),
      memberId: z.number().describe("Member ID for the time entry"),
      timeStart: z.string().describe("Start time (ISO 8601)"),
      timeEnd: z.string().optional().describe("End time (ISO 8601)"),
      actualHours: z.number().optional().describe("Actual hours worked (alternative to timeEnd)"),
      notes: z.string().optional().describe("Work notes"),
      internalNotes: z.string().optional().describe("Internal-only notes"),
      workTypeId: z.number().optional().describe("Work type ID"),
      workRoleId: z.number().optional().describe("Work role ID"),
    },
    async ({ chargeToType, chargeToId, memberId, timeStart, timeEnd, actualHours, notes, internalNotes, workTypeId, workRoleId }) => {
      const body: Record<string, unknown> = {
        chargeToType,
        chargeToId,
        member: { id: memberId },
        timeStart,
      };
      if (timeEnd) body.timeEnd = timeEnd;
      if (actualHours !== undefined) body.actualHours = actualHours;
      if (notes) body.notes = notes;
      if (internalNotes) body.internalNotes = internalNotes;
      if (workTypeId) body.workType = { id: workTypeId };
      if (workRoleId) body.workRole = { id: workRoleId };
      const result = await client.post("/time/entries", body);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}