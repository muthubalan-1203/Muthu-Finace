import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

// 1. Request Notification Permissions
export async function requestNotificationPermission() {
  if (!Capacitor.isNativePlatform()) return false;
  
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch (error) {
    console.error('Notification permission error:', error);
    return false;
  }
}

// 2. Schedule Bill or Loan Reminder Notification
export async function scheduleBillReminder(billId, billName, amount, dueDate) {
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Convert dueDate string to Date object
    const dueDateTime = new Date(dueDate);
    
    // Notification-a due dateku oru naal munnadi (oru morning 9:00 AM-ku) trigger panrom
    const notificationTime = new Date(dueDateTime.getTime());
    notificationTime.setDate(notificationTime.getDate() - 1);
    notificationTime.setHours(9, 0, 0, 0);

    // Oruvela munnadi set panna time already poiruntha, due date day morning 8:00 AM-ku vechururom
    if (notificationTime.getTime() <= Date.now()) {
      notificationTime.setTime(dueDateTime.getTime());
      notificationTime.setHours(8, 0, 0, 0);
    }

    // Cancel existing reminder with same ID if any
    await LocalNotifications.cancel({ notifications: [{ id: Number(billId) }] });

    // Schedule new local notification
    await LocalNotifications.schedule({
      notifications: [
        {
          title: '⚠️ Bill Due Reminder',
          body: `${billName} of ₹${amount} is due tomorrow! Tap to view.`,
          id: Number(billId),
          schedule: { at: notificationTime },
          sound: null,
          smallIcon: 'ic_stat_icon_config_sample',
        }
      ]
    });
    console.log(`Notification scheduled for bill ${billName} at ${notificationTime}`);
  } catch (error) {
    console.error('Error scheduling bill reminder:', error);
  }
}

// 3. Cancel Notification (when bill is paid or deleted)
export async function cancelNotification(id) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: Number(id) }] });
  } catch (error) {
    console.error('Error canceling notification:', error);
  }
}
