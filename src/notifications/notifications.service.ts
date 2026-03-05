import { Injectable, Logger } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushTokenDto } from './dto/register-push-token.dto';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private prisma: PrismaService) {}

  async register(userId: string, dto: RegisterPushTokenDto) {
    return this.prisma.pushToken.upsert({
      where: { token: dto.token },
      update: {
        platform: dto.platform,
        device: dto.device,
        userId,
      },
      create: {
        token: dto.token,
        platform: dto.platform,
        device: dto.device,
        userId,
      },
    });
  }

  async sendTest(userId: string, title: string, body: string) {
    this.logger.log(
      `Sending test notification to user ${userId}: ${title} - ${body}`,
    );
    // Mock push notification logic
    return { success: true };
  }

  async sendSMS(phone: string, message: string) {
    // Logic for sending SMS/WhatsApp/Telegram
    this.logger.log(`Sending notification to ${phone}: ${message}`);
    // In a real implementation, you'd use a provider like Twilio, Eskiz (Uzbekistan), or a Telegram Bot.
    return { success: true };
  }

  async notifyOrderCreated(phone: string, trackCode: string, total: number) {
    const text = `Ruxshona Tort: Buyurtmangiz qabul qilindi. Kod: ${trackCode}. Summa: ${total.toLocaleString()} so'm.`;
    return this.sendSMS(phone, text);
  }

  async notifyOrderStatusChanged(
    phone: string,
    trackCode: string,
    status: OrderStatus,
  ) {
    let statusText = 'holati yangilandi';
    if (status === OrderStatus.IN_DELIVERY)
      statusText = "qabul qilindi va yo'lga chiqarildi";
    if (status === OrderStatus.DELIVERED) statusText = 'yetkazib berildi';
    if (status === OrderStatus.CANCELED) statusText = 'bekor qilindi';
    const text = `Ruxshona Tort: Buyurtmangiz ${statusText}. Kod: ${trackCode}.`;
    return this.sendSMS(phone, text);
  }

  async notifyPointsEarned(phone: string, points: number, balance: number) {
    const text = `Tabriklaymiz! Sizga ${points} ball taqdim etildi. Umumiy balansingiz: ${balance} ball.`;
    return this.sendSMS(phone, text);
  }

  async notifyBirthdayCoupon(phone: string, code: string, discount: number) {
    const text = `Tug'ilgan kuningiz bilan! Sovg'a sifatida ${discount} so'mlik kupon: ${code}. Uni checkoutda ishlating!`;
    return this.sendSMS(phone, text);
  }
}
