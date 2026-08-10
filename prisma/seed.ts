import "dotenv/config";
import {
  PrismaClient,
  Prisma,
  type PurchaseOrderStatus,
  type ShipmentStage,
  type RiskLevel,
  type DocumentType,
  type DocumentReviewStatus,
} from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

const MILESTONE_TEMPLATE = [
  { name: "Booked", stage: "BOOKED" },
  { name: "Origin Pickup", stage: "ORIGIN_PICKUP" },
  { name: "Departed Port of Loading", stage: "PORT_OF_LOADING" },
  { name: "Arrived Port of Discharge", stage: "PORT_OF_DISCHARGE" },
  { name: "Customs Cleared", stage: "CUSTOMS_CLEARANCE" },
  { name: "Delivered", stage: "DELIVERED" },
] as const;

const STAGE_ORDER = [
  "BOOKED",
  "ORIGIN_PICKUP",
  "PORT_OF_LOADING",
  "IN_TRANSIT",
  "PORT_OF_DISCHARGE",
  "CUSTOMS_CLEARANCE",
  "INLAND_TRANSIT",
  "DELIVERED",
  "CLOSED",
] as const;

// A shipment "at" a given stage has completed every milestone up to the
// closest preceding template entry, and has the next one in progress.
function buildMilestones(shipmentId: string, currentStage: string, bookedOffsetDays: number, atRiskMilestoneName?: string) {
  const currentIndex = STAGE_ORDER.indexOf(currentStage as (typeof STAGE_ORDER)[number]);
  return MILESTONE_TEMPLATE.map((m, i) => {
    const templateIndex = STAGE_ORDER.indexOf(m.stage);
    const plannedDate = days(bookedOffsetDays + i * 6);
    let status: "PENDING" | "IN_PROGRESS" | "COMPLETE" | "AT_RISK" | "DELAYED" = "PENDING";
    let actualDate: Date | undefined;

    if (templateIndex < currentIndex) {
      status = "COMPLETE";
      actualDate = plannedDate;
    } else if (templateIndex === currentIndex) {
      status = "IN_PROGRESS";
    }
    if (atRiskMilestoneName === m.name) {
      status = status === "COMPLETE" ? "COMPLETE" : "AT_RISK";
    }
    return {
      shipmentId,
      name: m.name,
      sequence: i,
      plannedDate,
      actualDate,
      status,
    };
  });
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.$transaction([
    prisma.approvalDecision.deleteMany(),
    prisma.aiRecommendation.deleteMany(),
    prisma.activityEvent.deleteMany(),
    prisma.task.deleteMany(),
    prisma.exception.deleteMany(),
    prisma.parsedField.deleteMany(),
    prisma.document.deleteMany(),
    prisma.costLine.deleteMany(),
    prisma.shipmentContainer.deleteMany(),
    prisma.shipmentMilestone.deleteMany(),
    prisma.shipment.deleteMany(),
    prisma.purchaseOrderLineItem.deleteMany(),
    prisma.purchaseOrder.deleteMany(),
    prisma.riskSignal.deleteMany(),
    prisma.supplierContact.deleteMany(),
    prisma.supplier.deleteMany(),
    prisma.automationRule.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  console.log("Seeding organization & users...");
  const org = await prisma.organization.create({
    data: { name: "Kestrel Import Co.", slug: "kestrel-import-co" },
  });

  // James (owner) and Lindsey (viewer) round out the team roster shown in
  // Settings but aren't referenced directly elsewhere in this script.
  const [sarah, marcus, priya, diego] = await Promise.all([
    prisma.user.create({
      data: { organizationId: org.id, name: "Sarah Nguyen", email: "sarah.nguyen@kestrelimport.com", role: "OPS_MANAGER", initials: "SN" },
    }),
    prisma.user.create({
      data: { organizationId: org.id, name: "Marcus Webb", email: "marcus.webb@kestrelimport.com", role: "TRADE_COORDINATOR", initials: "MW" },
    }),
    prisma.user.create({
      data: { organizationId: org.id, name: "Priya Shah", email: "priya.shah@kestrelimport.com", role: "FINANCE", initials: "PS" },
    }),
    prisma.user.create({
      data: { organizationId: org.id, name: "Diego Ramirez", email: "diego.ramirez@kestrelimport.com", role: "WAREHOUSE", initials: "DR" },
    }),
    prisma.user.create({
      data: { organizationId: org.id, name: "James Okafor", email: "james.okafor@kestrelimport.com", role: "OWNER", initials: "JO" },
    }),
    prisma.user.create({
      data: { organizationId: org.id, name: "Lindsey Cho", email: "lindsey.cho@kestrelimport.com", role: "VIEWER", initials: "LC" },
    }),
  ]);

  console.log("Seeding suppliers...");
  const huaxin = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Huaxin Metal Works",
      country: "China",
      category: "Metal Hardware & Fixtures",
      riskLevel: "LOW",
      onTimeRate: 0.94,
      defectRate: 0.02,
      activeSince: new Date("2019-03-01"),
      notes: "Long-standing supplier for cabinet and shelving hardware. Consistent quality.",
      contacts: {
        create: [{ name: "Wei Zhang", role: "Account Manager", email: "wei.zhang@huaxinmetal.cn", phone: "+86 574 8821 0192" }],
      },
    },
  });

  const vantage = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Vantage Textiles Ltd.",
      country: "Vietnam",
      category: "Home Textiles",
      riskLevel: "MODERATE",
      onTimeRate: 0.86,
      defectRate: 0.04,
      activeSince: new Date("2021-06-15"),
      notes: "Growing volume. Port congestion at Cat Lai has caused recurring ETA slippage this quarter.",
      contacts: {
        create: [{ name: "Linh Pham", role: "Export Coordinator", email: "linh.pham@vantagetextiles.vn", phone: "+84 28 3822 4471" }],
      },
    },
  });

  const silverline = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Silverline Electronics Co.",
      country: "China",
      category: "Consumer Electronics Accessories",
      riskLevel: "ELEVATED",
      onTimeRate: 0.78,
      defectRate: 0.07,
      activeSince: new Date("2020-01-10"),
      notes: "Reliability has declined over the last two quarters. Under active performance review.",
      contacts: {
        create: [{ name: "Kevin Liu", role: "Sales Director", email: "kevin.liu@silverline-electronics.cn", phone: "+86 755 2389 6604" }],
      },
      riskSignals: {
        create: [
          {
            signalType: "Late shipment pattern",
            severity: "ELEVATED",
            description: "3 of the last 5 shipments departed more than 4 days behind the confirmed booking date.",
            detectedAt: days(-9),
          },
          {
            signalType: "Documentation accuracy",
            severity: "MODERATE",
            description: "Packing list quantities have required correction on 2 of the last 4 shipments.",
            detectedAt: days(-3),
          },
        ],
      },
    },
  });

  const delta = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Delta Cookware Manufacturing",
      country: "China",
      category: "Kitchenware",
      riskLevel: "LOW",
      onTimeRate: 0.91,
      defectRate: 0.03,
      activeSince: new Date("2017-09-01"),
      notes: "Reliable production partner. Customs documentation has occasionally lagged shipment departure.",
      contacts: {
        create: [{ name: "Grace Tan", role: "Export Documentation Lead", email: "grace.tan@deltacookware.cn", phone: "+86 757 8630 5521" }],
      },
    },
  });

  const novara = await prisma.supplier.create({
    data: {
      organizationId: org.id,
      name: "Novara Furnishings",
      country: "Vietnam",
      category: "Ready-to-Assemble Furniture",
      riskLevel: "MODERATE",
      onTimeRate: 0.88,
      defectRate: 0.03,
      activeSince: new Date("2022-02-20"),
      notes: "Newer relationship. Inspection paperwork has been inconsistent ahead of warehouse handoff.",
      contacts: {
        create: [{ name: "Huy Tran", role: "Logistics Coordinator", email: "huy.tran@novarafurnishings.vn", phone: "+84 24 3936 8850" }],
      },
    },
  });

  console.log("Seeding automation rules...");
  await prisma.automationRule.createMany({
    data: [
      {
        organizationId: org.id,
        name: "Auto-flag quantity mismatches above threshold",
        description: "When parsed invoice and packing list quantities disagree by more than 3%, automatically open a quantity mismatch exception.",
        triggerEvent: "document_parsed",
        condition: "abs(invoice_qty - packing_list_qty) / invoice_qty > 0.03",
        action: "create_exception:QUANTITY_MISMATCH",
        requiresApproval: false,
        isActive: true,
      },
      {
        organizationId: org.id,
        name: "Require approval for supplier outreach",
        description: "Any AI-recommended message to a supplier (correction request, escalation) requires human approval before it can be marked applied.",
        triggerEvent: "recommendation_created",
        condition: "recommendation.category == 'supplier_outreach'",
        action: "require_approval",
        requiresApproval: true,
        isActive: true,
      },
      {
        organizationId: org.id,
        name: "Escalate high cost variance to finance",
        description: "Cost line variances exceeding 15% of forecast are automatically surfaced to the finance owner as a cost variance exception.",
        triggerEvent: "cost_line_confirmed",
        condition: "(actual - forecast) / forecast > 0.15",
        action: "create_exception:COST_VARIANCE",
        requiresApproval: false,
        isActive: true,
      },
      {
        organizationId: org.id,
        name: "Escalate low-confidence extractions for review",
        description: "Parsed fields with model confidence below 80% are routed to a human reviewer before being trusted downstream.",
        triggerEvent: "document_parsed",
        condition: "field.confidence < 0.80",
        action: "flag_for_review",
        requiresApproval: false,
        isActive: true,
      },
    ],
  });

  // ---------------------------------------------------------------------
  // Purchase orders, shipments, and their operational stories
  // ---------------------------------------------------------------------

  console.log("Seeding purchase orders, shipments, and scenarios...");

  type Scenario = {
    poNumber: string;
    supplier: typeof huaxin;
    poStatus: PurchaseOrderStatus;
    orderDateOffset: number;
    totalValue: number;
    lineItems: { sku: string; description: string; quantityOrdered: number; unitCost: number }[];
    shipment?: {
      shipmentNumber: string;
      stage: ShipmentStage;
      originPort: string;
      destinationPort: string;
      carrier: string;
      vesselName?: string;
      incoterm: string;
      bookedOffsetDays: number;
      riskLevel: RiskLevel;
      owner: typeof sarah;
      atRiskMilestone?: string;
      containers: { containerNumber: string; sealNumber: string; containerType: string; grossWeightKg: number }[];
    };
  };

  const scenarios: Scenario[] = [
    {
      poNumber: "PO-1877",
      supplier: huaxin,
      poStatus: "CLOSED",
      orderDateOffset: -70,
      totalValue: 48200,
      lineItems: [{ sku: "HXN-BRK-220", description: "Adjustable shelf brackets, zinc-plated", quantityOrdered: 24000, unitCost: 2.01 }],
      shipment: {
        shipmentNumber: "SHP-10299",
        stage: "CLOSED",
        originPort: "Ningbo, CN",
        destinationPort: "Oakland, US",
        carrier: "Pacific Ocean Line",
        vesselName: "MV Pacific Voyager",
        incoterm: "FOB",
        bookedOffsetDays: -58,
        riskLevel: "LOW",
        owner: priya,
        containers: [{ containerNumber: "PONU4471820", sealNumber: "SL88213", containerType: "40HC", grossWeightKg: 18420 }],
      },
    },
    {
      poNumber: "PO-1988",
      supplier: vantage,
      poStatus: "SHIPPED",
      orderDateOffset: -34,
      totalValue: 61500,
      lineItems: [{ sku: "VTX-THR-410", description: "Cotton-blend throw blankets, assorted", quantityOrdered: 18000, unitCost: 3.42 }],
      shipment: {
        shipmentNumber: "SHP-10387",
        stage: "IN_TRANSIT",
        originPort: "Ho Chi Minh City, VN",
        destinationPort: "Long Beach, US",
        carrier: "Meridian Freight Lines",
        vesselName: "MV Meridian Star",
        incoterm: "FOB",
        bookedOffsetDays: -22,
        riskLevel: "MODERATE",
        owner: marcus,
        atRiskMilestone: "Arrived Port of Discharge",
        containers: [{ containerNumber: "MFLU2209471", sealNumber: "SL10248", containerType: "40HC", grossWeightKg: 15980 }],
      },
    },
    {
      poNumber: "PO-1942",
      supplier: vantage,
      poStatus: "SHIPPED",
      orderDateOffset: -41,
      totalValue: 39800,
      lineItems: [{ sku: "VTX-CUR-115", description: "Blackout curtain panels, 84in", quantityOrdered: 9600, unitCost: 4.15 }],
      shipment: {
        shipmentNumber: "SHP-10410",
        stage: "PORT_OF_DISCHARGE",
        originPort: "Ho Chi Minh City, VN",
        destinationPort: "Long Beach, US",
        carrier: "Meridian Freight Lines",
        vesselName: "MV Meridian Tide",
        incoterm: "FOB",
        bookedOffsetDays: -29,
        riskLevel: "LOW",
        owner: marcus,
        containers: [{ containerNumber: "MFLU2287635", sealNumber: "SL10339", containerType: "40HC", grossWeightKg: 12100 }],
      },
    },
    {
      poNumber: "PO-2077",
      supplier: huaxin,
      poStatus: "SHIPPED",
      orderDateOffset: -30,
      totalValue: 27650,
      lineItems: [{ sku: "HXN-HNG-330", description: "Soft-close cabinet hinges", quantityOrdered: 32000, unitCost: 0.86 }],
      shipment: {
        shipmentNumber: "SHP-10430",
        stage: "CUSTOMS_CLEARANCE",
        originPort: "Ningbo, CN",
        destinationPort: "Oakland, US",
        carrier: "Pacific Ocean Line",
        vesselName: "MV Pacific Horizon",
        incoterm: "FOB",
        bookedOffsetDays: -24,
        riskLevel: "ELEVATED",
        owner: sarah,
        atRiskMilestone: "Customs Cleared",
        containers: [{ containerNumber: "PONU4498215", sealNumber: "SL88347", containerType: "40HC", grossWeightKg: 9840 }],
      },
    },
    {
      poNumber: "PO-2043",
      supplier: silverline,
      poStatus: "SHIPPED",
      orderDateOffset: -27,
      totalValue: 92400,
      lineItems: [{ sku: "SLV-CBL-702", description: "USB-C fast charge cables, 6ft", quantityOrdered: 4200, unitCost: 2.2 }],
      shipment: {
        shipmentNumber: "SHP-10441",
        stage: "PORT_OF_DISCHARGE",
        originPort: "Shenzhen, CN",
        destinationPort: "Oakland, US",
        carrier: "Golden Gate Shipping",
        vesselName: "MV Golden Current",
        incoterm: "FOB",
        bookedOffsetDays: -19,
        riskLevel: "ELEVATED",
        owner: sarah,
        containers: [{ containerNumber: "GGSU3391044", sealNumber: "SL55129", containerType: "40HC", grossWeightKg: 8210 }],
      },
    },
    {
      poNumber: "PO-2056",
      supplier: novara,
      poStatus: "SHIPPED",
      orderDateOffset: -25,
      totalValue: 71200,
      lineItems: [{ sku: "NVF-SHF-880", description: "3-tier RTA bookshelf, walnut finish", quantityOrdered: 1800, unitCost: 39.55 }],
      shipment: {
        shipmentNumber: "SHP-10455",
        stage: "INLAND_TRANSIT",
        originPort: "Ho Chi Minh City, VN",
        destinationPort: "Long Beach, US",
        carrier: "Meridian Freight Lines",
        vesselName: "MV Meridian Star",
        incoterm: "FOB",
        bookedOffsetDays: -20,
        riskLevel: "MODERATE",
        owner: diego,
        containers: [{ containerNumber: "MFLU2301198", sealNumber: "SL10412", containerType: "40HC", grossWeightKg: 21300 }],
      },
    },
    {
      poNumber: "PO-2101",
      supplier: delta,
      poStatus: "SHIPPED",
      orderDateOffset: -22,
      totalValue: 54900,
      lineItems: [{ sku: "DLT-PAN-560", description: "Non-stick cookware set, 10pc", quantityOrdered: 3000, unitCost: 18.3 }],
      shipment: {
        shipmentNumber: "SHP-10462",
        stage: "CUSTOMS_CLEARANCE",
        originPort: "Foshan (via Shenzhen), CN",
        destinationPort: "Oakland, US",
        carrier: "Golden Gate Shipping",
        vesselName: "MV Golden Reach",
        incoterm: "FOB",
        bookedOffsetDays: -17,
        riskLevel: "HIGH",
        owner: marcus,
        atRiskMilestone: "Customs Cleared",
        containers: [{ containerNumber: "GGSU3402517", sealNumber: "SL55247", containerType: "40HC", grossWeightKg: 11760 }],
      },
    },
    {
      poNumber: "PO-2118",
      supplier: delta,
      poStatus: "SHIPPED",
      orderDateOffset: -12,
      totalValue: 22100,
      lineItems: [{ sku: "DLT-KTL-140", description: "Stainless kettle, 1.8L", quantityOrdered: 2600, unitCost: 8.5 }],
      shipment: {
        shipmentNumber: "SHP-10470",
        stage: "BOOKED",
        originPort: "Foshan (via Shenzhen), CN",
        destinationPort: "Oakland, US",
        carrier: "Golden Gate Shipping",
        incoterm: "FOB",
        bookedOffsetDays: -3,
        riskLevel: "LOW",
        owner: marcus,
        containers: [],
      },
    },
    {
      poNumber: "PO-2130",
      supplier: silverline,
      poStatus: "SHIPPED",
      orderDateOffset: -9,
      totalValue: 38600,
      lineItems: [{ sku: "SLV-SPK-310", description: "Bluetooth speaker, compact", quantityOrdered: 3100, unitCost: 12.45 }],
      shipment: {
        shipmentNumber: "SHP-10475",
        stage: "ORIGIN_PICKUP",
        originPort: "Shenzhen, CN",
        destinationPort: "Oakland, US",
        carrier: "Golden Gate Shipping",
        incoterm: "FOB",
        bookedOffsetDays: -2,
        riskLevel: "LOW",
        owner: sarah,
        containers: [],
      },
    },
    {
      poNumber: "PO-2145",
      supplier: novara,
      poStatus: "SHIPPED",
      orderDateOffset: -15,
      totalValue: 44300,
      lineItems: [{ sku: "NVF-DSK-410", description: "Compact writing desk, oak finish", quantityOrdered: 950, unitCost: 46.6 }],
      shipment: {
        shipmentNumber: "SHP-10480",
        stage: "PORT_OF_LOADING",
        originPort: "Ho Chi Minh City, VN",
        destinationPort: "Long Beach, US",
        carrier: "Meridian Freight Lines",
        vesselName: "MV Meridian Tide",
        incoterm: "FOB",
        bookedOffsetDays: -6,
        riskLevel: "LOW",
        owner: diego,
        containers: [{ containerNumber: "MFLU2318804", sealNumber: "SL10488", containerType: "40HC", grossWeightKg: 14650 }],
      },
    },
    {
      poNumber: "PO-2160",
      supplier: vantage,
      poStatus: "IN_PRODUCTION",
      orderDateOffset: -8,
      totalValue: 33900,
      lineItems: [{ sku: "VTX-RUG-220", description: "Woven area rug, 5x7", quantityOrdered: 2400, unitCost: 14.12 }],
    },
    {
      poNumber: "PO-2175",
      supplier: delta,
      poStatus: "CONFIRMED",
      orderDateOffset: -4,
      totalValue: 19800,
      lineItems: [{ sku: "DLT-BAK-090", description: "Baking sheet set, 3pc", quantityOrdered: 3600, unitCost: 5.5 }],
    },
  ];

  const shipmentsByNumber: Record<string, Prisma.ShipmentGetPayload<object>> = {};
  const posByNumber: Record<string, Prisma.PurchaseOrderGetPayload<object>> = {};

  for (const scenario of scenarios) {
    const po = await prisma.purchaseOrder.create({
      data: {
        organizationId: org.id,
        poNumber: scenario.poNumber,
        supplierId: scenario.supplier.id,
        status: scenario.poStatus,
        orderDate: days(scenario.orderDateOffset),
        requestedDeliveryDate: days(scenario.orderDateOffset + 60),
        totalValue: new Prisma.Decimal(scenario.totalValue),
        lineItems: { create: scenario.lineItems.map((li) => ({ ...li, unitCost: new Prisma.Decimal(li.unitCost) })) },
      },
    });
    posByNumber[scenario.poNumber] = po;

    await prisma.activityEvent.create({
      data: {
        organizationId: org.id,
        occurredAt: days(scenario.orderDateOffset),
        actorLabel: "System",
        eventType: "po_created",
        summary: `Purchase order ${scenario.poNumber} created for ${scenario.supplier.name}.`,
        purchaseOrderId: po.id,
      },
    });

    if (!scenario.shipment) continue;

    const s = scenario.shipment;
    const eta = days(s.bookedOffsetDays + 30);
    const shipment = await prisma.shipment.create({
      data: {
        organizationId: org.id,
        purchaseOrderId: po.id,
        shipmentNumber: s.shipmentNumber,
        stage: s.stage,
        originPort: s.originPort,
        destinationPort: s.destinationPort,
        carrier: s.carrier,
        vesselName: s.vesselName,
        incoterm: s.incoterm,
        etd: days(s.bookedOffsetDays + 4),
        eta,
        riskLevel: s.riskLevel,
        ownerId: s.owner.id,
        createdAt: days(s.bookedOffsetDays),
        containers: { create: s.containers },
      },
    });
    shipmentsByNumber[s.shipmentNumber] = shipment;

    await prisma.shipmentMilestone.createMany({
      data: buildMilestones(shipment.id, s.stage, s.bookedOffsetDays, s.atRiskMilestone),
    });

    await prisma.activityEvent.create({
      data: {
        organizationId: org.id,
        occurredAt: days(s.bookedOffsetDays),
        actorLabel: "System",
        eventType: "shipment_booked",
        summary: `Shipment ${s.shipmentNumber} booked with ${s.carrier}${s.vesselName ? ` on ${s.vesselName}` : ""}.`,
        shipmentId: shipment.id,
        purchaseOrderId: po.id,
      },
    });
  }

  console.log("Seeding documents & parsed fields...");

  async function addDocument(opts: {
    shipmentNumber: string;
    type: DocumentType;
    fileName: string;
    sourceLabel: string;
    reviewStatus: DocumentReviewStatus;
    uploadedOffsetDays: number;
    fields: { fieldKey: string; fieldLabel: string; value: string; confidence: number; verified?: boolean }[];
  }) {
    const shipment = shipmentsByNumber[opts.shipmentNumber];
    const doc = await prisma.document.create({
      data: {
        organizationId: org.id,
        shipmentId: shipment.id,
        purchaseOrderId: shipment.purchaseOrderId,
        type: opts.type,
        fileName: opts.fileName,
        sourceLabel: opts.sourceLabel,
        reviewStatus: opts.reviewStatus,
        uploadedAt: days(opts.uploadedOffsetDays),
        parsedFields: {
          create: opts.fields.map((f) => ({
            fieldKey: f.fieldKey,
            fieldLabel: f.fieldLabel,
            value: f.value,
            confidence: f.confidence,
            verified: f.verified ?? false,
          })),
        },
      },
    });
    await prisma.activityEvent.create({
      data: {
        organizationId: org.id,
        occurredAt: days(opts.uploadedOffsetDays),
        actorLabel: "Parsing Engine",
        eventType: "document_parsed",
        summary: `${docTypeLabel(opts.type)} uploaded and parsed for ${opts.shipmentNumber} (${opts.fields.length} fields extracted).`,
        shipmentId: shipment.id,
        documentId: doc.id,
      },
    });
    return doc;
  }

  function docTypeLabel(t: DocumentType) {
    return (
      {
        COMMERCIAL_INVOICE: "Commercial invoice",
        PACKING_LIST: "Packing list",
        BILL_OF_LADING: "Bill of lading",
        CERTIFICATE_OF_ORIGIN: "Certificate of origin",
        CUSTOMS_DECLARATION: "Customs declaration",
        INSPECTION_REPORT: "Inspection report",
        INSURANCE_CERTIFICATE: "Insurance certificate",
        OTHER: "Document",
      } as const
    )[t];
  }

  // SHP-10441 — Silverline quantity mismatch
  await addDocument({
    shipmentNumber: "SHP-10441",
    type: "COMMERCIAL_INVOICE",
    fileName: "SLV-INV-88231.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "VERIFIED",
    uploadedOffsetDays: -18,
    fields: [
      { fieldKey: "total_quantity", fieldLabel: "Total Quantity", value: "4,200 units", confidence: 0.97, verified: true },
      { fieldKey: "invoice_amount", fieldLabel: "Invoice Amount", value: "$92,400.00", confidence: 0.98, verified: true },
      { fieldKey: "invoice_date", fieldLabel: "Invoice Date", value: "2026-07-24", confidence: 0.95, verified: true },
    ],
  });
  await addDocument({
    shipmentNumber: "SHP-10441",
    type: "PACKING_LIST",
    fileName: "SLV-PKL-88231.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "FLAGGED",
    uploadedOffsetDays: -17,
    fields: [
      { fieldKey: "total_quantity", fieldLabel: "Total Quantity", value: "3,960 units", confidence: 0.93 },
      { fieldKey: "carton_count", fieldLabel: "Carton Count", value: "198", confidence: 0.9 },
      { fieldKey: "packing_date", fieldLabel: "Packing Date", value: "2026-07-25", confidence: 0.88 },
    ],
  });

  // SHP-10387 — Vantage ETA delay
  await addDocument({
    shipmentNumber: "SHP-10387",
    type: "BILL_OF_LADING",
    fileName: "VTX-BOL-55102.pdf",
    sourceLabel: "Freight forwarder portal",
    reviewStatus: "VERIFIED",
    uploadedOffsetDays: -21,
    fields: [
      { fieldKey: "vessel_name", fieldLabel: "Vessel Name", value: "MV Meridian Star", confidence: 0.99, verified: true },
      { fieldKey: "original_eta", fieldLabel: "Original ETA", value: "2026-08-16", confidence: 0.96, verified: true },
    ],
  });

  // SHP-10430 — Huaxin customs hold
  await addDocument({
    shipmentNumber: "SHP-10430",
    type: "CUSTOMS_DECLARATION",
    fileName: "HXN-CD-30215.pdf",
    sourceLabel: "Customs broker upload",
    reviewStatus: "FLAGGED",
    uploadedOffsetDays: -4,
    fields: [
      { fieldKey: "declaration_status", fieldLabel: "Declaration Status", value: "Held for physical inspection", confidence: 0.99, verified: true },
      { fieldKey: "hold_reason_code", fieldLabel: "Hold Reason Code", value: "CBP-RANDOM-EXAM", confidence: 0.91 },
    ],
  });

  // SHP-10462 — Delta missing certificate of origin
  await addDocument({
    shipmentNumber: "SHP-10462",
    type: "COMMERCIAL_INVOICE",
    fileName: "DLT-INV-71440.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "VERIFIED",
    uploadedOffsetDays: -16,
    fields: [
      { fieldKey: "invoice_amount", fieldLabel: "Invoice Amount", value: "$54,900.00", confidence: 0.98, verified: true },
      { fieldKey: "hs_code", fieldLabel: "HS Code", value: "7323.93", confidence: 0.9, verified: true },
    ],
  });
  await addDocument({
    shipmentNumber: "SHP-10462",
    type: "PACKING_LIST",
    fileName: "DLT-PKL-71440.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "VERIFIED",
    uploadedOffsetDays: -16,
    fields: [{ fieldKey: "total_quantity", fieldLabel: "Total Quantity", value: "3,000 units", confidence: 0.96, verified: true }],
  });

  // SHP-10410 — Vantage document mismatch (container count)
  await addDocument({
    shipmentNumber: "SHP-10410",
    type: "BILL_OF_LADING",
    fileName: "VTX-BOL-55098.pdf",
    sourceLabel: "Freight forwarder portal",
    reviewStatus: "FLAGGED",
    uploadedOffsetDays: -25,
    fields: [{ fieldKey: "container_count", fieldLabel: "Container Count", value: "1", confidence: 0.94 }],
  });
  await addDocument({
    shipmentNumber: "SHP-10410",
    type: "PACKING_LIST",
    fileName: "VTX-PKL-55098.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "FLAGGED",
    uploadedOffsetDays: -25,
    fields: [{ fieldKey: "container_count", fieldLabel: "Container Count", value: "2", confidence: 0.85 }],
  });

  // SHP-10455 — Novara missing inspection report
  await addDocument({
    shipmentNumber: "SHP-10455",
    type: "PACKING_LIST",
    fileName: "NVF-PKL-40217.pdf",
    sourceLabel: "Supplier email attachment",
    reviewStatus: "VERIFIED",
    uploadedOffsetDays: -19,
    fields: [{ fieldKey: "total_quantity", fieldLabel: "Total Quantity", value: "1,800 units", confidence: 0.95, verified: true }],
  });

  console.log("Seeding cost lines...");
  await prisma.costLine.createMany({
    data: [
      // SHP-10299 — closed, cost variance exception (brokerage)
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10299"].id, purchaseOrderId: posByNumber["PO-1877"].id, category: "FREIGHT", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(4200), actualAmount: new Prisma.Decimal(4150) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10299"].id, purchaseOrderId: posByNumber["PO-1877"].id, category: "DUTY", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(2890), actualAmount: new Prisma.Decimal(2905) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10299"].id, purchaseOrderId: posByNumber["PO-1877"].id, category: "BROKERAGE", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(1850), actualAmount: new Prisma.Decimal(2430), varianceNote: "Additional customs exam fee applied; not reflected in original forecast." },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10299"].id, purchaseOrderId: posByNumber["PO-1877"].id, category: "INLAND_TRANSPORT", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(980), actualAmount: new Prisma.Decimal(965) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10299"].id, purchaseOrderId: posByNumber["PO-1877"].id, category: "WAREHOUSING", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(410), actualAmount: new Prisma.Decimal(410) },

      // SHP-10387 — in transit
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10387"].id, purchaseOrderId: posByNumber["PO-1988"].id, category: "FREIGHT", status: "EXPECTED", forecastAmount: new Prisma.Decimal(3600), actualAmount: new Prisma.Decimal(3600) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10387"].id, purchaseOrderId: posByNumber["PO-1988"].id, category: "DUTY", status: "FORECAST", forecastAmount: new Prisma.Decimal(2460) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10387"].id, purchaseOrderId: posByNumber["PO-1988"].id, category: "BROKERAGE", status: "FORECAST", forecastAmount: new Prisma.Decimal(1400) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10387"].id, purchaseOrderId: posByNumber["PO-1988"].id, category: "INLAND_TRANSPORT", status: "FORECAST", forecastAmount: new Prisma.Decimal(890) },

      // SHP-10441 — Silverline, qty mismatch may affect duty
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10441"].id, purchaseOrderId: posByNumber["PO-2043"].id, category: "FREIGHT", status: "EXPECTED", forecastAmount: new Prisma.Decimal(2950), actualAmount: new Prisma.Decimal(2950) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10441"].id, purchaseOrderId: posByNumber["PO-2043"].id, category: "DUTY", status: "FORECAST", forecastAmount: new Prisma.Decimal(4620), varianceNote: "Pending resolution of quantity mismatch before duty can be confirmed." },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10441"].id, purchaseOrderId: posByNumber["PO-2043"].id, category: "BROKERAGE", status: "FORECAST", forecastAmount: new Prisma.Decimal(1580) },

      // SHP-10430 — Huaxin customs hold, brokerage likely to increase
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10430"].id, purchaseOrderId: posByNumber["PO-2077"].id, category: "FREIGHT", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(2100), actualAmount: new Prisma.Decimal(2100) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10430"].id, purchaseOrderId: posByNumber["PO-2077"].id, category: "BROKERAGE", status: "EXPECTED", forecastAmount: new Prisma.Decimal(1200), actualAmount: new Prisma.Decimal(1875), varianceNote: "Customs exam fee applied while shipment is held for inspection." },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10430"].id, purchaseOrderId: posByNumber["PO-2077"].id, category: "WAREHOUSING", status: "EXPECTED", forecastAmount: new Prisma.Decimal(320), varianceNote: "Storage fees accruing daily while shipment awaits inspection release." },

      // SHP-10462 — Delta, missing COO
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10462"].id, purchaseOrderId: posByNumber["PO-2101"].id, category: "FREIGHT", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(2480), actualAmount: new Prisma.Decimal(2480) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10462"].id, purchaseOrderId: posByNumber["PO-2101"].id, category: "DUTY", status: "FORECAST", forecastAmount: new Prisma.Decimal(1647), varianceNote: "Preferential duty rate at risk without Certificate of Origin on file." },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10462"].id, purchaseOrderId: posByNumber["PO-2101"].id, category: "BROKERAGE", status: "FORECAST", forecastAmount: new Prisma.Decimal(1350) },

      // SHP-10455 — Novara
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10455"].id, purchaseOrderId: posByNumber["PO-2056"].id, category: "FREIGHT", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(3850), actualAmount: new Prisma.Decimal(3850) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10455"].id, purchaseOrderId: posByNumber["PO-2056"].id, category: "DUTY", status: "CONFIRMED", forecastAmount: new Prisma.Decimal(2136), actualAmount: new Prisma.Decimal(2136) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10455"].id, purchaseOrderId: posByNumber["PO-2056"].id, category: "INLAND_TRANSPORT", status: "EXPECTED", forecastAmount: new Prisma.Decimal(1450) },
      { organizationId: org.id, shipmentId: shipmentsByNumber["SHP-10455"].id, purchaseOrderId: posByNumber["PO-2056"].id, category: "WAREHOUSING", status: "FORECAST", forecastAmount: new Prisma.Decimal(560) },
    ],
  });

  console.log("Seeding exceptions, tasks, and recommendations...");

  // 1. Quantity mismatch — Silverline / SHP-10441
  const excQty = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "QUANTITY_MISMATCH",
      severity: "HIGH",
      status: "OPEN",
      title: "Invoice and packing list quantities disagree by 5.7%",
      description: "Commercial invoice states 4,200 units; packing list states 3,960 units for the same shipment. Variance exceeds the 3% auto-flag threshold and affects declared customs value.",
      shipmentId: shipmentsByNumber["SHP-10441"].id,
      purchaseOrderId: posByNumber["PO-2043"].id,
      supplierId: silverline.id,
      ownerId: marcus.id,
      detectedAt: days(-17),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Request corrected packing list from Silverline Electronics",
      description: "Send discrepancy summary to Kevin Liu and request a corrected packing list or written confirmation of the shipped quantity before customs filing.",
      status: "IN_PROGRESS",
      urgency: "HIGH",
      ownerId: marcus.id,
      dueDate: days(2),
      exceptionId: excQty.id,
      shipmentId: shipmentsByNumber["SHP-10441"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excQty.id,
      shipmentId: shipmentsByNumber["SHP-10441"].id,
      purchaseOrderId: posByNumber["PO-2043"].id,
      title: "Request corrected packing list before customs filing",
      recommendedAction: "Send a discrepancy notice to Silverline Electronics requesting a corrected packing list or written confirmation of shipped quantity, and hold customs filing until resolved.",
      rationale: "Invoice quantity (4,200) and packing list quantity (3,960) diverge by 5.7%, above the 3% auto-flag threshold. Filing customs with mismatched documentation risks a compliance flag and incorrect duty assessment.",
      confidence: 0.91,
      status: "PENDING",
    },
  });

  // 2. ETA delay — Vantage / SHP-10387
  const excEta = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "ETA_DELAY",
      severity: "MEDIUM",
      status: "IN_PROGRESS",
      title: "Revised ETA pushed 6 days due to Cat Lai port congestion",
      description: "Freight forwarder reports vessel MV Meridian Star delayed at transshipment due to congestion at Cat Lai. Revised ETA is 6 days behind the original schedule.",
      shipmentId: shipmentsByNumber["SHP-10387"].id,
      purchaseOrderId: posByNumber["PO-1988"].id,
      supplierId: vantage.id,
      ownerId: marcus.id,
      detectedAt: days(-6),
    },
  });
  await prisma.shipment.update({
    where: { id: shipmentsByNumber["SHP-10387"].id },
    data: { revisedEta: days(24 + 6) },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Confirm revised ETA with freight forwarder",
      description: "Get written confirmation of the revised ETA and pass the update to the warehouse receiving schedule.",
      status: "OPEN",
      urgency: "NORMAL",
      ownerId: marcus.id,
      dueDate: days(1),
      exceptionId: excEta.id,
      shipmentId: shipmentsByNumber["SHP-10387"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excEta.id,
      shipmentId: shipmentsByNumber["SHP-10387"].id,
      purchaseOrderId: posByNumber["PO-1988"].id,
      title: "Confirm revised ETA and update warehouse schedule",
      recommendedAction: "Request written ETA confirmation from the freight forwarder and update the warehouse receiving calendar to reflect the 6-day slip.",
      rationale: "Port congestion at Cat Lai is a known recurring pattern for this lane. Confirming the revised date now avoids a last-minute receiving conflict and gives downstream planning enough lead time.",
      confidence: 0.87,
      status: "PENDING",
    },
  });

  // 3. Document mismatch — Vantage / SHP-10410
  const excDocMismatch = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "DOCUMENT_MISMATCH",
      severity: "LOW",
      status: "OPEN",
      title: "Container count differs between bill of lading and packing list",
      description: "Bill of lading lists 1 container; packing list references 2 containers for the same shipment. Likely a packing list drafting error, but requires confirmation before warehouse receiving.",
      shipmentId: shipmentsByNumber["SHP-10410"].id,
      purchaseOrderId: posByNumber["PO-1942"].id,
      supplierId: vantage.id,
      ownerId: diego.id,
      detectedAt: days(-24),
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excDocMismatch.id,
      shipmentId: shipmentsByNumber["SHP-10410"].id,
      purchaseOrderId: posByNumber["PO-1942"].id,
      title: "Confirm actual container count with freight forwarder",
      recommendedAction: "Verify the actual container count against the forwarder's booking confirmation before scheduling the warehouse receiving appointment.",
      rationale: "A single mismatched field between two otherwise consistent documents is most often a drafting error, but an incorrect container count would affect receiving dock scheduling.",
      confidence: 0.72,
      status: "PENDING",
    },
  });

  // 4. Brokerage cost variance — Huaxin / SHP-10299
  const excCost = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "COST_VARIANCE",
      severity: "MEDIUM",
      status: "OPEN",
      title: "Brokerage cost 31% over forecast on closed shipment",
      description: "Confirmed brokerage cost of $2,430 against a forecast of $1,850, driven by an unplanned customs exam fee. Exceeds the 15% auto-escalation threshold.",
      shipmentId: shipmentsByNumber["SHP-10299"].id,
      purchaseOrderId: posByNumber["PO-1877"].id,
      supplierId: huaxin.id,
      ownerId: priya.id,
      detectedAt: days(-40),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Review brokerage variance with customs broker",
      description: "Confirm the customs exam fee was applied correctly and evaluate whether forecast brokerage rates for this lane need adjustment.",
      status: "OPEN",
      urgency: "NORMAL",
      ownerId: priya.id,
      dueDate: days(5),
      exceptionId: excCost.id,
      shipmentId: shipmentsByNumber["SHP-10299"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excCost.id,
      shipmentId: shipmentsByNumber["SHP-10299"].id,
      purchaseOrderId: posByNumber["PO-1877"].id,
      title: "Escalate brokerage variance to finance for review",
      recommendedAction: "Route the confirmed brokerage variance to finance to validate the exam fee and reassess the standing brokerage forecast for Ningbo-origin shipments.",
      rationale: "A 31% variance against forecast on a confirmed cost line exceeds the 15% auto-escalation threshold defined in the cost variance automation rule.",
      confidence: 0.84,
      status: "APPROVED",
      decidedById: priya.id,
      decidedAt: days(-38),
    },
  });

  // 5. Supplier risk — Silverline
  const excSupplierRisk = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "SUPPLIER_RISK",
      severity: "HIGH",
      status: "OPEN",
      title: "Silverline Electronics reliability trending down",
      description: "3 of the last 5 shipments departed more than 4 days behind schedule, and 2 of the last 4 shipments required a packing list correction. Pattern warrants a formal performance review.",
      supplierId: silverline.id,
      ownerId: sarah.id,
      detectedAt: days(-9),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Schedule quarterly performance review with Silverline Electronics",
      description: "Compile the last two quarters of on-time and documentation accuracy data and schedule a review call with Kevin Liu.",
      status: "OPEN",
      urgency: "NORMAL",
      ownerId: sarah.id,
      dueDate: days(10),
      exceptionId: excSupplierRisk.id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excSupplierRisk.id,
      title: "Flag Silverline Electronics for quarterly performance review",
      recommendedAction: "Schedule a formal performance review covering on-time delivery and documentation accuracy trends over the last two quarters.",
      rationale: "On-time rate has fallen to 78% against a 90%+ target range, with a concurrent rise in documentation corrections. Two independent risk signals reinforcing the same trend indicate a systemic issue rather than a one-off.",
      confidence: 0.79,
      status: "PENDING",
    },
  });

  // 6. Missing inspection report — Novara / SHP-10455
  const excMissingInspection = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "DOCUMENT_MISSING",
      severity: "MEDIUM",
      status: "IN_PROGRESS",
      title: "Inspection report missing ahead of warehouse receiving",
      description: "Packing list is on file, but the pre-shipment inspection report has not been received. Warehouse receiving appointment is scheduled in 4 days.",
      shipmentId: shipmentsByNumber["SHP-10455"].id,
      purchaseOrderId: posByNumber["PO-2056"].id,
      supplierId: novara.id,
      ownerId: diego.id,
      detectedAt: days(-5),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Request inspection report before warehouse receiving",
      description: "Follow up with Huy Tran for the outstanding pre-shipment inspection report ahead of the scheduled receiving appointment.",
      status: "IN_PROGRESS",
      urgency: "HIGH",
      ownerId: diego.id,
      dueDate: days(2),
      exceptionId: excMissingInspection.id,
      shipmentId: shipmentsByNumber["SHP-10455"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excMissingInspection.id,
      shipmentId: shipmentsByNumber["SHP-10455"].id,
      purchaseOrderId: posByNumber["PO-2056"].id,
      title: "Request inspection report ahead of receiving appointment",
      recommendedAction: "Send a follow-up request to Novara Furnishings for the pre-shipment inspection report, referencing the upcoming receiving appointment date.",
      rationale: "Warehouse receiving policy requires an inspection report on file before palletized furniture is accepted. The receiving appointment is 4 days out with no report yet logged.",
      confidence: 0.88,
      status: "PENDING",
    },
  });

  // 7. Missing certificate of origin — Delta / SHP-10462 (CRITICAL)
  const excMissingCoo = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "DOCUMENT_MISSING",
      severity: "CRITICAL",
      status: "OPEN",
      title: "Certificate of Origin missing before customs submission",
      description: "Commercial invoice and packing list are verified, but no Certificate of Origin has been received. Preferential duty treatment cannot be claimed without it, and the customs submission window closes in 2 days.",
      shipmentId: shipmentsByNumber["SHP-10462"].id,
      purchaseOrderId: posByNumber["PO-2101"].id,
      supplierId: delta.id,
      ownerId: marcus.id,
      detectedAt: days(-2),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Escalate missing Certificate of Origin to Delta Cookware",
      description: "Contact Grace Tan directly (not standard email queue) — customs submission window closes in 2 days and preferential duty rate is at risk.",
      status: "OPEN",
      urgency: "HIGH",
      ownerId: marcus.id,
      dueDate: days(1),
      exceptionId: excMissingCoo.id,
      shipmentId: shipmentsByNumber["SHP-10462"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excMissingCoo.id,
      shipmentId: shipmentsByNumber["SHP-10462"].id,
      purchaseOrderId: posByNumber["PO-2101"].id,
      title: "Escalate missing Certificate of Origin before submission deadline",
      recommendedAction: "Contact Delta Cookware's export documentation lead directly to expedite the Certificate of Origin, and notify the customs broker of the at-risk submission window.",
      rationale: "Without the Certificate of Origin, this shipment cannot claim preferential duty treatment (estimated $1,647 duty exposure) and risks missing the 2-day customs submission window entirely.",
      confidence: 0.95,
      status: "PENDING",
    },
  });

  // 8. Customs hold — Huaxin / SHP-10430
  const excCustomsHold = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "CUSTOMS_HOLD",
      severity: "HIGH",
      status: "OPEN",
      title: "Shipment held for CBP random examination",
      description: "Customs declaration shows the shipment selected for physical inspection. Release timeline is not yet confirmed, and inland delivery is at risk of delay.",
      shipmentId: shipmentsByNumber["SHP-10430"].id,
      purchaseOrderId: posByNumber["PO-2077"].id,
      supplierId: huaxin.id,
      ownerId: sarah.id,
      detectedAt: days(-4),
    },
  });
  await prisma.task.create({
    data: {
      organizationId: org.id,
      title: "Coordinate with customs broker on exam release timeline",
      description: "Get an estimated release date from the customs broker and notify the warehouse of the potential inland delivery delay.",
      status: "OPEN",
      urgency: "HIGH",
      ownerId: sarah.id,
      dueDate: days(1),
      exceptionId: excCustomsHold.id,
      shipmentId: shipmentsByNumber["SHP-10430"].id,
    },
  });
  await prisma.aiRecommendation.create({
    data: {
      organizationId: org.id,
      exceptionId: excCustomsHold.id,
      shipmentId: shipmentsByNumber["SHP-10430"].id,
      purchaseOrderId: posByNumber["PO-2077"].id,
      title: "Coordinate exam release timeline and notify warehouse",
      recommendedAction: "Request an estimated release date from the customs broker and proactively notify the warehouse that inland delivery may slip.",
      rationale: "Random CBP exams typically add 3-7 business days. Notifying the warehouse now, before a delay is confirmed, keeps the receiving schedule flexible rather than reactive.",
      confidence: 0.82,
      status: "PENDING",
    },
  });

  // 9. Resolved — Huaxin / SHP-10299 (closed shipment, historical record for analytics)
  const excResolvedDoc = await prisma.exception.create({
    data: {
      organizationId: org.id,
      type: "DOCUMENT_MISSING",
      severity: "LOW",
      status: "RESOLVED",
      title: "Packing list initially missing before customs filing",
      description: "Packing list was not on file at the standard 5-day-pre-departure checkpoint.",
      shipmentId: shipmentsByNumber["SHP-10299"].id,
      purchaseOrderId: posByNumber["PO-1877"].id,
      supplierId: huaxin.id,
      ownerId: priya.id,
      detectedAt: days(-55),
      resolvedAt: days(-52),
      resolutionSummary: "Corrected packing list received from Huaxin Metal Works before the customs filing deadline. No delay to the shipment.",
    },
  });

  console.log("Seeding activity events for exception timelines...");
  await prisma.activityEvent.createMany({
    data: [
      { organizationId: org.id, occurredAt: days(-17), actorLabel: "Parsing Engine", eventType: "exception_detected", summary: "Quantity mismatch detected between invoice and packing list (5.7% variance).", shipmentId: shipmentsByNumber["SHP-10441"].id, exceptionId: excQty.id },
      { organizationId: org.id, occurredAt: days(-16), actorId: marcus.id, actorLabel: "Marcus Webb", eventType: "task_assigned", summary: "Follow-up task assigned to request a corrected packing list.", shipmentId: shipmentsByNumber["SHP-10441"].id, exceptionId: excQty.id },

      { organizationId: org.id, occurredAt: days(-6), actorLabel: "Freight Forwarder Update", eventType: "eta_revised", summary: "Freight forwarder reported a 6-day ETA slip due to Cat Lai port congestion.", shipmentId: shipmentsByNumber["SHP-10387"].id, exceptionId: excEta.id },

      { organizationId: org.id, occurredAt: days(-4), actorLabel: "Customs Broker Update", eventType: "customs_hold", summary: "Shipment selected for CBP random physical examination.", shipmentId: shipmentsByNumber["SHP-10430"].id, exceptionId: excCustomsHold.id },

      { organizationId: org.id, occurredAt: days(-2), actorLabel: "Parsing Engine", eventType: "exception_detected", summary: "Certificate of Origin missing with customs submission window closing in 2 days.", shipmentId: shipmentsByNumber["SHP-10462"].id, exceptionId: excMissingCoo.id },
      { organizationId: org.id, occurredAt: days(-2), actorId: marcus.id, actorLabel: "Marcus Webb", eventType: "task_assigned", summary: "Escalation task assigned for missing Certificate of Origin.", shipmentId: shipmentsByNumber["SHP-10462"].id, exceptionId: excMissingCoo.id },

      { organizationId: org.id, occurredAt: days(-40), actorLabel: "Finance Sync", eventType: "cost_confirmed", summary: "Brokerage cost confirmed at $2,430 against a $1,850 forecast.", shipmentId: shipmentsByNumber["SHP-10299"].id, exceptionId: excCost.id },
      { organizationId: org.id, occurredAt: days(-38), actorId: priya.id, actorLabel: "Priya Shah", eventType: "recommendation_approved", summary: "Approved recommendation to escalate brokerage variance for review.", shipmentId: shipmentsByNumber["SHP-10299"].id, exceptionId: excCost.id },

      { organizationId: org.id, occurredAt: days(-9), actorLabel: "Automation Rule", eventType: "risk_signal_detected", summary: "Late shipment pattern detected: 3 of last 5 shipments delayed more than 4 days.", exceptionId: excSupplierRisk.id },

      { organizationId: org.id, occurredAt: days(-5), actorLabel: "Warehouse Schedule Sync", eventType: "exception_detected", summary: "Inspection report not on file ahead of scheduled receiving appointment.", shipmentId: shipmentsByNumber["SHP-10455"].id, exceptionId: excMissingInspection.id },

      { organizationId: org.id, occurredAt: days(-24), actorLabel: "Parsing Engine", eventType: "exception_detected", summary: "Container count mismatch detected between bill of lading and packing list.", shipmentId: shipmentsByNumber["SHP-10410"].id, exceptionId: excDocMismatch.id },

      { organizationId: org.id, occurredAt: days(-55), actorLabel: "Parsing Engine", eventType: "exception_detected", summary: "Packing list not on file at the 5-day-pre-departure checkpoint.", shipmentId: shipmentsByNumber["SHP-10299"].id, exceptionId: excResolvedDoc.id },
      { organizationId: org.id, occurredAt: days(-52), actorId: priya.id, actorLabel: "Priya Shah", eventType: "exception_resolved", summary: "Resolved: corrected packing list received before the customs filing deadline.", shipmentId: shipmentsByNumber["SHP-10299"].id, exceptionId: excResolvedDoc.id },
    ],
  });

  console.log("Seed complete.");
  console.log({
    organization: org.name,
    users: 6,
    suppliers: 5,
    purchaseOrders: scenarios.length,
    shipments: Object.keys(shipmentsByNumber).length,
    exceptions: 9,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
