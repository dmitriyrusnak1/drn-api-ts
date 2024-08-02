import { Request, Response } from "express";
import {
  GetInventoryQuery,
  INVENTORY_TYPE,
  PatchInventoryBody,
  PostInventoryBody,
} from "./inventory.service.model";
import db from "../../db/db";

export const getInventory = async (req: Request, res: Response) => {
  const query = req.query as GetInventoryQuery;
  const dbResponse = await db.getInventory(
    query.course,
    query.name,
    query.disc,
    query.phoneNumber,
    query.bin,
    query.dateFound,
    query.dateTexted,
    query.dateClaimed,
    query.status,
    query.comments,
    query.color,
    query.claimBy,
    query.brand,
    query.dateSold,
    query.reminderTextSent,
    query.topImage,
    query.bottomImage,
    query.deleted ?? [0]
  );
  if ("errors" in dbResponse) {
    console.error(dbResponse, "errors in dbResponse (getInventory)");
    res.status(500).send(dbResponse);
    return;
  }
  const { data } = dbResponse;
  if (
    !Array.isArray(data) ||
    !data.every((d) => typeof d === "object" && "id" in d)
  ) {
    console.error(dbResponse, "dbResponse bad format (getInventory)");
    res.status(500).send({ errors: [{ code: "", message: "" }] });
    return;
  }
  const serializedData = data.map((d) => {
    const serial = {} as typeof d;
    Object.entries(d).forEach(
      ([key, value]) =>
        (serial[key] =
          value instanceof Date ? value.toISOString().split("T")[0] : value)
    );
    return serial;
  });
  const mappedData = serializedData.map((d) => {
    const mappedData = {
      type: INVENTORY_TYPE,
      id: d.id,
      attributes: { ...d },
    };
    delete mappedData.attributes.id;
    return mappedData;
  });
  const response = {
    data: mappedData,
  };
  res.send(response);
};

export const postInventory = async (req: Request, res: Response) => {
  const body = req.body as PostInventoryBody;
  const dbResponse = await db.postInventory(body.data.attributes);
  if ("errors" in dbResponse) {
    console.error(dbResponse, "errors in dbResponse (postInventory)");
    res.status(500).send(dbResponse);
    return;
  }
  if (!("insertId" in dbResponse.data)) {
    console.error(dbResponse, "misisng insertId in dbResponse (postInventory)");
    res.status(500).send({ errors: [{ code: "", message: "" }] });
    return;
  }
  res.send({
    data: { id: dbResponse.data.insertId, ...body.data, type: INVENTORY_TYPE },
  });
};

export const patchInventory = async (req: Request, res: Response) => {
  const body = req.body as PatchInventoryBody;
  const { itemId } = req.params;
  if (typeof itemId !== "number") {
    res
      .status(400)
      .send({ errors: [{ code: "", message: "unknown item id type" }] });
    return;
  }
  const dbResponse = await db.patchInventory(itemId, body.data.attributes);
  if ("errors" in dbResponse) {
    console.error(dbResponse, "errors in db response (patchInventory)");
    res.status(500).send(dbResponse);
    return;
  }
  if (!("changedRows" in dbResponse.data) || dbResponse.data.changedRows > 1) {
    console.error(dbResponse, "bad changedRows data (patchInventory)");
    res.status(500).send({ errors: [{ code: "", message: "" }] });
  }
  res.send({ data: { id: itemId, ...body.data, type: INVENTORY_TYPE } });
};
