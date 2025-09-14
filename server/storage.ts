import { customers, rentals, staff, vehicles, deliveries, invoices, staffLogs, bookingRequests, customerBadges, customerActivity, customerReviews, loyaltyTiers, type Customer, type InsertCustomer, type Rental, type InsertRental, type Staff, type Vehicle, type InsertVehicle, type Delivery, type InsertDelivery, type Invoice, type InsertInvoice, type StaffLog, type InsertStaffLog, type BookingRequest, type InsertBookingRequest, type CustomerBadge, type InsertCustomerBadge, type CustomerActivity, type InsertCustomerActivity, type CustomerReview, type InsertCustomerReview, type LoyaltyTier, type InsertLoyaltyTier } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, ne, lte, gte, asc } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Customer methods
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerById(id: number): Promise<Customer | undefined>;
  updateCustomerStatus(id: number, status: string): Promise<void>;
  updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  getAllCustomers(): Promise<Customer[]>;

  // Rental methods
  createRental(rental: InsertRental): Promise<Rental>;
  getRentalById(id: number): Promise<Rental | undefined>;
  updateRental(id: number, updates: Partial<InsertRental>): Promise<Rental>;
  updateRentalPdf(id: number, pdfUrl: string): Promise<void>;
  getRentalsByCustomer(customerId: number): Promise<Rental[]>;
  getAllRentals(): Promise<Rental[]>;
  deleteRental(id: number): Promise<void>;
  getRentalsPDF(filter?: string): Promise<{ rentals: Rental[], buffer?: Buffer }>;
  
  // Vehicle scheduling methods
  checkVehicleAvailability(vehicle: string, startDate: Date, endDate: Date, excludeRentalId?: number): Promise<boolean>;
  getVehicleSchedule(vehicle: string, month?: number, year?: number): Promise<Rental[]>;
  getConflictingRentals(vehicle: string, startDate: Date, endDate: Date, excludeRentalId?: number): Promise<Rental[]>;
  getCalendarBookings(month?: number, year?: number): Promise<any[]>;

  // Staff methods
  getStaffByUsername(username: string): Promise<Staff | undefined>;

  // Vehicle methods
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  getAllVehicles(): Promise<Vehicle[]>;
  getVehicleById(id: number): Promise<Vehicle | undefined>;
  updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle>;
  deleteVehicle(id: number): Promise<void>;

  // Delivery methods
  createDelivery(delivery: InsertDelivery): Promise<Delivery>;
  getAllDeliveries(): Promise<Delivery[]>;
  getDeliveriesByStaff(staffId: number): Promise<Delivery[]>;
  deleteDelivery(id: number): Promise<void>;

  // Invoice methods
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  getAllInvoices(): Promise<Invoice[]>;
  deleteInvoice(id: number): Promise<void>;

  // Staff logging methods
  createStaffLog(log: InsertStaffLog): Promise<StaffLog>;
  getAllStaffLogs(): Promise<StaffLog[]>;

  // Booking request methods  
  createBookingRequest(request: InsertBookingRequest): Promise<BookingRequest>;
  getAllBookingRequests(): Promise<any[]>;
  getBookingRequestById(id: number): Promise<BookingRequest | undefined>;
  getBookingRequestsByCustomer(customerId: number): Promise<BookingRequest[]>;
  getBookingRequestsByStatus(status: string): Promise<any[]>;
  updateBookingRequestStatus(id: number, status: string, staffId?: number, reason?: string): Promise<void>;
  updateBookingRequestNotifications(id: number, emailSent?: boolean, whatsappSent?: boolean): Promise<void>;
  updateBookingRequestConversion(id: number, rentalId: number): Promise<void>;
  deleteBookingRequest(id: number): Promise<void>;
  
  // Gamification methods
  updateCustomerPoints(customerId: number, points: number): Promise<void>;
  addCustomerActivity(activity: InsertCustomerActivity): Promise<CustomerActivity>;
  addCustomerBadge(badge: InsertCustomerBadge): Promise<CustomerBadge>;
  getCustomerBadges(customerId: number): Promise<CustomerBadge[]>;
  getCustomerActivities(customerId: number): Promise<CustomerActivity[]>;
  createCustomerReview(review: InsertCustomerReview): Promise<CustomerReview>;
  getCustomerReviews(customerId: number): Promise<CustomerReview[]>;
  getPublicReviews(): Promise<CustomerReview[]>;
  getCustomerLeaderboard(limit?: number): Promise<Customer[]>;
  getLoyaltyTierByPoints(points: number): Promise<LoyaltyTier | undefined>;
  updateCustomerLevel(customerId: number, level: number): Promise<void>;
  updateCustomerStats(customerId: number, updates: { totalBookings?: number; totalSpent?: string }): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const customerData = {
      ...insertCustomer,
      utilityBillUrl: insertCustomer.utilityBillUrl || null,
      socialMediaHandle: insertCustomer.socialMediaHandle || null,
    };
    
    const [customer] = await db
      .insert(customers)
      .values(customerData)
      .returning();
    return customer;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.email, email));
    return customer || undefined;
  }

  async getCustomerById(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer || undefined;
  }

  async updateCustomerStatus(id: number, status: string): Promise<void> {
    await db
      .update(customers)
      .set({ status })
      .where(eq(customers.id, id));
  }

  async updateCustomer(id: number, updates: Partial<InsertCustomer>): Promise<Customer> {
    const [customer] = await db
      .update(customers)
      .set(updates)
      .where(eq(customers.id, id))
      .returning();
    return customer;
  }

  async deleteCustomer(id: number): Promise<void> {
    // First delete all rentals for this customer
    await db.delete(rentals).where(eq(rentals.customerId, id));
    // Then delete the customer
    await db.delete(customers).where(eq(customers.id, id));
  }

  async getAllCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(customers.fullName);
  }

  async createRental(insertRental: InsertRental): Promise<Rental> {
    const [rental] = await db
      .insert(rentals)
      .values(insertRental)
      .returning();
    return rental;
  }

  async getRentalById(id: number): Promise<Rental | undefined> {
    const [rental] = await db.select().from(rentals).where(eq(rentals.id, id));
    return rental || undefined;
  }

  async updateRentalPdf(id: number, pdfUrl: string): Promise<void> {
    await db
      .update(rentals)
      .set({ agreementPdfUrl: pdfUrl, status: "completed" })
      .where(eq(rentals.id, id));
  }

  async getRentalsByCustomer(customerId: number): Promise<Rental[]> {
    return await db.select().from(rentals).where(eq(rentals.customerId, customerId)).orderBy(desc(rentals.createdAt));
  }

  async getAllRentals(): Promise<Rental[]> {
    return await db.select().from(rentals).orderBy(desc(rentals.createdAt));
  }

  async updateRentalStatus(id: number, status: string): Promise<Rental> {
    const [rental] = await db
      .update(rentals)
      .set({ status })
      .where(eq(rentals.id, id))
      .returning();
    return rental;
  }

  async updateRental(id: number, updates: Partial<InsertRental>): Promise<Rental> {
    const [rental] = await db
      .update(rentals)
      .set(updates)
      .where(eq(rentals.id, id))
      .returning();
    return rental;
  }

  async deleteRental(id: number): Promise<void> {
    await db.delete(rentals).where(eq(rentals.id, id));
  }

  async getStaffByUsername(username: string): Promise<Staff | undefined> {
    const [staffMember] = await db.select().from(staff).where(eq(staff.username, username));
    return staffMember || undefined;
  }

  async createStaff(staffData: { username: string; password: string }): Promise<Staff> {
    const hashedPassword = await this.hashPassword(staffData.password);
    const [newStaff] = await db
      .insert(staff)
      .values({ username: staffData.username, hashedPassword })
      .returning();
    return newStaff;
  }

  async updateStaffPassword(staffId: number, newPassword: string): Promise<void> {
    const hashedPassword = await this.hashPassword(newPassword);
    await db
      .update(staff)
      .set({ hashedPassword })
      .where(eq(staff.id, staffId));
  }

  async deleteStaff(staffId: number): Promise<void> {
    await db.delete(staff).where(eq(staff.id, staffId));
  }

  async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 12);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }



  async checkVehicleAvailability(vehicle: string, startDate: Date, endDate: Date, excludeRentalId?: number): Promise<boolean> {
    let conditions = and(
      eq(rentals.vehicle, vehicle),
      ne(rentals.status, 'cancelled'),
      or(
        // New rental starts during existing rental
        and(
          lte(rentals.startDate, startDate),
          gte(rentals.endDate, startDate)
        ),
        // New rental ends during existing rental
        and(
          lte(rentals.startDate, endDate),
          gte(rentals.endDate, endDate)
        ),
        // New rental completely overlaps existing rental
        and(
          gte(rentals.startDate, startDate),
          lte(rentals.endDate, endDate)
        )
      )
    );

    if (excludeRentalId) {
      conditions = and(conditions, ne(rentals.id, excludeRentalId));
    }

    const conflicts = await db.select().from(rentals).where(conditions);
    return conflicts.length === 0;
  }

  async getVehicleSchedule(vehicle: string, month?: number, year?: number): Promise<Rental[]> {
    let conditions = and(
      eq(rentals.vehicle, vehicle),
      ne(rentals.status, 'cancelled')
    );

    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      
      conditions = and(
        conditions,
        or(
          and(
            gte(rentals.startDate, startOfMonth),
            lte(rentals.startDate, endOfMonth)
          ),
          and(
            gte(rentals.endDate, startOfMonth),
            lte(rentals.endDate, endOfMonth)
          ),
          and(
            lte(rentals.startDate, startOfMonth),
            gte(rentals.endDate, endOfMonth)
          )
        )
      );
    }

    return await db.select().from(rentals).where(conditions).orderBy(rentals.startDate);
  }

  async getConflictingRentals(vehicle: string, startDate: Date, endDate: Date, excludeRentalId?: number): Promise<Rental[]> {
    let conditions = and(
      eq(rentals.vehicle, vehicle),
      ne(rentals.status, 'cancelled'),
      or(
        // New rental starts during existing rental
        and(
          lte(rentals.startDate, startDate),
          gte(rentals.endDate, startDate)
        ),
        // New rental ends during existing rental
        and(
          lte(rentals.startDate, endDate),
          gte(rentals.endDate, endDate)
        ),
        // New rental completely overlaps existing rental
        and(
          gte(rentals.startDate, startDate),
          lte(rentals.endDate, endDate)
        )
      )
    );

    if (excludeRentalId) {
      conditions = and(conditions, ne(rentals.id, excludeRentalId));
    }

    return await db.select().from(rentals).where(conditions);
  }

  async getCalendarBookings(month?: number, year?: number): Promise<any[]> {
    // Include all non-cancelled rentals (pending, completed)
    let conditions = ne(rentals.status, 'cancelled');

    if (month && year) {
      const startOfMonth = new Date(year, month - 1, 1);
      const endOfMonth = new Date(year, month, 0, 23, 59, 59);
      
      conditions = and(
        conditions,
        or(
          and(
            gte(rentals.startDate, startOfMonth),
            lte(rentals.startDate, endOfMonth)
          ),
          and(
            gte(rentals.endDate, startOfMonth),
            lte(rentals.endDate, endOfMonth)
          ),
          and(
            lte(rentals.startDate, startOfMonth),
            gte(rentals.endDate, endOfMonth)
          )
        )
      ) as any;
    }

    const rentalBookings = await db.select({
      id: rentals.id,
      vehicle: rentals.vehicle,
      startDate: rentals.startDate,
      endDate: rentals.endDate,
      customerId: rentals.customerId,
      status: rentals.status,
      customerName: customers.fullName
    }).from(rentals)
      .leftJoin(customers, eq(rentals.customerId, customers.id))
      .where(conditions)
      .orderBy(rentals.startDate);

    return rentalBookings;
  }

  // Vehicle methods
  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const [vehicle] = await db.insert(vehicles).values(insertVehicle).returning();
    return vehicle;
  }

  async getAllVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).orderBy(asc(vehicles.name));
  }

  async getVehicleById(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle || undefined;
  }

  async updateVehicle(id: number, updates: Partial<InsertVehicle>): Promise<Vehicle> {
    const [vehicle] = await db.update(vehicles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vehicles.id, id))
      .returning();
    return vehicle;
  }

  async deleteVehicle(id: number): Promise<void> {
    await db.delete(vehicles).where(eq(vehicles.id, id));
  }

  // Delivery methods
  async createDelivery(insertDelivery: InsertDelivery): Promise<Delivery> {
    const [delivery] = await db.insert(deliveries).values(insertDelivery).returning();
    return delivery;
  }

  async getAllDeliveries(): Promise<Delivery[]> {
    return await db.select().from(deliveries).orderBy(desc(deliveries.createdAt));
  }

  async getDeliveriesByStaff(staffId: number): Promise<Delivery[]> {
    return await db.select().from(deliveries)
      .where(eq(deliveries.staffId, staffId))
      .orderBy(desc(deliveries.createdAt));
  }

  async deleteDelivery(id: number): Promise<void> {
    await db.delete(deliveries).where(eq(deliveries.id, id));
  }

  // Invoice methods
  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const [invoice] = await db.insert(invoices).values(insertInvoice).returning();
    return invoice;
  }

  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  async updateCustomerTermsAcceptance(customerId: number): Promise<void> {
    await db.update(customers)
      .set({ 
        status: 'active',
        // Note: We're using status field to track terms acceptance
        // since we removed password-based auth
      })
      .where(eq(customers.id, customerId));
  }

  async getInvoiceById(id: number): Promise<Invoice | null> {
    const result = await db.select().from(invoices).where(eq(invoices.id, id)).limit(1);
    return result[0] || null;
  }

  async getRentalsPDF(filter?: string): Promise<{ rentals: Rental[], buffer?: Buffer }> {
    let conditions: any = ne(rentals.status, 'cancelled');
    
    if (filter && filter !== 'ALL') {
      const now = new Date();
      let dateThreshold: Date;
      
      switch (filter) {
        case '3days':
          dateThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          break;
        case '7days':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        default:
          dateThreshold = new Date(0); // All time
      }
      
      conditions = and(conditions, gte(rentals.createdAt, dateThreshold));
    }

    const rentalsList = await db.select().from(rentals).where(conditions).orderBy(desc(rentals.createdAt));
    return { rentals: rentalsList };
  }

  // Staff logging methods
  async createStaffLog(log: InsertStaffLog): Promise<StaffLog> {
    const [staffLog] = await db
      .insert(staffLogs)
      .values(log)
      .returning();
    return staffLog;
  }

  async getAllStaffLogs(): Promise<StaffLog[]> {
    return await db.select().from(staffLogs).orderBy(desc(staffLogs.timestamp));
  }

  async getStaffLogsByStaffId(staffId: number): Promise<StaffLog[]> {
    return await db.select().from(staffLogs)
      .where(eq(staffLogs.staffId, staffId))
      .orderBy(desc(staffLogs.timestamp));
  }

  async getAllStaff(): Promise<Staff[]> {
    return await db.select().from(staff).orderBy(staff.username);
  }

  // Booking request methods
  async createBookingRequest(request: InsertBookingRequest): Promise<BookingRequest> {
    const [bookingRequest] = await db
      .insert(bookingRequests)
      .values(request)
      .returning();
    return bookingRequest;
  }

  async getAllBookingRequests(): Promise<any[]> {
    const results = await db.select({
      id: bookingRequests.id,
      customerId: bookingRequests.customerId,
      vehicleId: bookingRequests.vehicleId,
      vehicleName: bookingRequests.vehicleName,
      startDate: bookingRequests.startDate,
      endDate: bookingRequests.endDate,
      totalDays: bookingRequests.totalDays,
      customerMessage: bookingRequests.customerMessage,
      status: bookingRequests.status,
      emailSent: bookingRequests.emailSent,
      whatsappSent: bookingRequests.whatsappSent,
      confirmedByStaffId: bookingRequests.confirmedByStaffId,
      confirmedAt: bookingRequests.confirmedAt,
      rejectedReason: bookingRequests.rejectedReason,
      createdAt: bookingRequests.createdAt,
      // Join customer data safely
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone
    }).from(bookingRequests)
      .leftJoin(customers, eq(bookingRequests.customerId, customers.id))
      .orderBy(desc(bookingRequests.createdAt));
    
    return results;
  }

  async getBookingRequestById(id: number): Promise<BookingRequest | undefined> {
    const [request] = await db.select().from(bookingRequests).where(eq(bookingRequests.id, id));
    return request || undefined;
  }

  async getBookingRequestsByCustomer(customerId: number): Promise<BookingRequest[]> {
    return await db.select().from(bookingRequests)
      .where(eq(bookingRequests.customerId, customerId))
      .orderBy(desc(bookingRequests.createdAt));
  }

  async getBookingRequestsByStatus(status: string): Promise<any[]> {
    return await db.select({
      id: bookingRequests.id,
      customerId: bookingRequests.customerId,
      vehicleId: bookingRequests.vehicleId,
      vehicleName: bookingRequests.vehicleName,
      startDate: bookingRequests.startDate,
      endDate: bookingRequests.endDate,
      totalDays: bookingRequests.totalDays,
      customerMessage: bookingRequests.customerMessage,
      status: bookingRequests.status,
      emailSent: bookingRequests.emailSent,
      whatsappSent: bookingRequests.whatsappSent,
      confirmedByStaffId: bookingRequests.confirmedByStaffId,
      confirmedAt: bookingRequests.confirmedAt,
      rejectedReason: bookingRequests.rejectedReason,
      createdAt: bookingRequests.createdAt,
      // Join customer data
      customerName: customers.fullName,
      customerEmail: customers.email,
      customerPhone: customers.phone
    }).from(bookingRequests)
      .leftJoin(customers, eq(bookingRequests.customerId, customers.id))
      .where(eq(bookingRequests.status, status))
      .orderBy(desc(bookingRequests.createdAt));
  }

  async updateBookingRequestStatus(id: number, status: string, staffId?: number, reason?: string): Promise<void> {
    const updates: any = { status };
    
    if (status === 'confirmed' && staffId) {
      updates.confirmedByStaffId = staffId;
      updates.confirmedAt = new Date();
    }
    
    if (status === 'rejected' && reason) {
      updates.rejectedReason = reason;
    }

    await db
      .update(bookingRequests)
      .set(updates)
      .where(eq(bookingRequests.id, id));
  }

  async updateBookingRequestNotifications(id: number, emailSent?: boolean, whatsappSent?: boolean): Promise<void> {
    const updates: any = {};
    
    if (emailSent !== undefined) {
      updates.emailSent = emailSent;
    }
    
    if (whatsappSent !== undefined) {
      updates.whatsappSent = whatsappSent;
    }

    await db
      .update(bookingRequests)
      .set(updates)
      .where(eq(bookingRequests.id, id));
  }

  async updateBookingRequestConversion(id: number, rentalId: number): Promise<void> {
    await db.update(bookingRequests)
      .set({ 
        status: 'converted_to_rental'
      })
      .where(eq(bookingRequests.id, id));
  }

  async deleteBookingRequest(id: number): Promise<void> {
    await db.delete(bookingRequests).where(eq(bookingRequests.id, id));
  }

  // Gamification methods
  async updateCustomerPoints(customerId: number, points: number): Promise<void> {
    await db.update(customers)
      .set({ 
        totalPoints: points,
        lastActivityAt: new Date()
      })
      .where(eq(customers.id, customerId));
  }

  async addCustomerActivity(activity: InsertCustomerActivity): Promise<CustomerActivity> {
    const [newActivity] = await db.insert(customerActivity)
      .values(activity)
      .returning();
    return newActivity;
  }

  async addCustomerBadge(badge: InsertCustomerBadge): Promise<CustomerBadge> {
    const [newBadge] = await db.insert(customerBadges)
      .values(badge)
      .returning();
    return newBadge;
  }

  async getCustomerBadges(customerId: number): Promise<CustomerBadge[]> {
    return db.select()
      .from(customerBadges)
      .where(eq(customerBadges.customerId, customerId))
      .orderBy(desc(customerBadges.earnedAt));
  }

  async getCustomerActivities(customerId: number): Promise<CustomerActivity[]> {
    return db.select()
      .from(customerActivity)
      .where(eq(customerActivity.customerId, customerId))
      .orderBy(desc(customerActivity.createdAt))
      .limit(20);
  }

  async createCustomerReview(review: InsertCustomerReview): Promise<CustomerReview> {
    const [newReview] = await db.insert(customerReviews)
      .values(review)
      .returning();
    return newReview;
  }

  async getCustomerReviews(customerId: number): Promise<CustomerReview[]> {
    return db.select()
      .from(customerReviews)
      .where(eq(customerReviews.customerId, customerId))
      .orderBy(desc(customerReviews.createdAt));
  }

  async getPublicReviews(): Promise<CustomerReview[]> {
    return db.select()
      .from(customerReviews)
      .where(eq(customerReviews.isPublic, true))
      .orderBy(desc(customerReviews.createdAt))
      .limit(10);
  }

  async getCustomerLeaderboard(limit: number = 10): Promise<Customer[]> {
    return db.select()
      .from(customers)
      .where(eq(customers.status, 'active'))
      .orderBy(desc(customers.totalPoints))
      .limit(limit);
  }

  async getLoyaltyTierByPoints(points: number): Promise<LoyaltyTier | undefined> {
    const tiers = await db.select()
      .from(loyaltyTiers)
      .where(lte(loyaltyTiers.minPoints, points))
      .orderBy(desc(loyaltyTiers.minPoints))
      .limit(1);
    return tiers[0];
  }

  async updateCustomerLevel(customerId: number, level: number): Promise<void> {
    await db.update(customers)
      .set({ currentLevel: level })
      .where(eq(customers.id, customerId));
  }

  async updateCustomerStats(customerId: number, updates: { totalBookings?: number; totalSpent?: string }): Promise<void> {
    await db.update(customers)
      .set(updates)
      .where(eq(customers.id, customerId));
  }
}

export const storage = new DatabaseStorage();
