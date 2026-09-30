import { FastifyInstance } from "fastify";
import * as controller from "./revocation.controller";

export default async function revocationRoutes(fastify: FastifyInstance) {
  fastify.post("/lists", controller.createList);
  fastify.get("/lists", controller.listLists);
  fastify.get("/lists/:listId", controller.getList);
  fastify.post("/lists/:listId/revoke", controller.revoke);
}
