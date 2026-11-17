# Testing guide

## Automated

```bash
npm test        # 21 Vitest tests for the engine: cart, money, checkout, challenges, questions, levels, rewards
npm run build   # also type-checks the whole project
```

The tests check, among other things, that:
- cash payments are validated against the wallet and the bill;
- change is correct, and wrong change is rejected;
- card payments need the exact amount and enough balance;
- generated budget challenges can always be won;
- every generated quiz question accepts its own answer, and its arithmetic is right;
- levels unlock only at the frontier, and achievements are awarded once.

## Manual test script (desktop or mobile browser)

1. **Onboarding:** Let's start → pick an avatar → type a nickname → Next → pick an age band. You should land on the game menu.
2. **Free shopping, the full journey:**
   1. Free Shopping → Enter the store. The doors slide open with a sound.
   2. Tap the trolley ("Tap to take me!"). It follows you from now on.
   3. Fruits & Vegetables → tap Banana. The product panel opens with a rotating preview. Press + to make it 2, then Add. The 🛒 badge shows 2 and ₹10.
   4. Drag an Apple from the shelf onto the 🛒 button or the 3D trolley. The total goes up by ₹20.
   5. Open 🛒: change a quantity and remove a line. The subtotals and total update.
   6. Checkout. Tap each item in the panel or on the 3D belt: beep, a bill line ("Banana × 2 = ₹10"), the register display updates and a bag appears.
   7. Cash. Tap ₹20 → Pay: it is rejected ("You need ₹10 more"). Drag a ₹50 into the tray → Pay ₹70 → the change step asks for ₹40. Give ₹30: rejected. Make it ₹40: accepted, and the receipt prints.
   8. Take my bags & finish. You should see the results card, coins, and the **First Shopping Trip** achievement toast.
3. **Card / UPI:** pay with Card, type a wrong amount (rejected), then type the exact total (approved).
4. **Shopping Challenge:** tap a list item. ShopBuddy flies you to that aisle. Take one extra item, check out, and the results show "not on the list" and the challenge is not won. Buy exactly the list to win.
5. **Budget Challenge:** go over the budget. The budget bar turns red, ShopBuddy warns you, and Checkout is refused until you remove items.
6. **Healthy Shopping:** the four checks tick as you add fruit and veg, dairy and grains. A second treat fails the "sometimes" rule.
7. **Timed Shopping:** let the timer run out. You get the "Time's up!" result.
8. **Quizzes:** Learning Path → Level 1. A wrong answer gives a hint; a second wrong answer shows the answer. 4/5 or better unlocks Level 2. Money Learning: in "give the change" questions the tray must not reveal the amount.
9. **Rewards:** buy and equip Ocean Blue. The trolley in the store turns blue. Equip a theme or accessory and check it shows in the store or on ShopBuddy.
10. **Persistence:** refresh the page. The profile, coins, stars, levels and achievements are still there.
11. **Parent dashboard:** answer the gate question. The stats match what you just played. Reset clears everything.
12. **Settings:** switch the voice and sound off and on. Low quality makes shelves lighter (fewer copies, no shadows).
13. **Responsive:** check phone width (375 px). The department bar scrolls, panels fit, and money can still be dragged with a finger.

## VR (Meta Quest Browser)

Run `npm run dev:https` and open the LAN URL on the Quest. Start any shopping game and press **🥽 Enter VR**.
- Point the controller ray at the floor and teleport. The trolley and ShopBuddy follow you.
- On the floating panel: Enter store → Take trolley → department buttons.
- Point at a product and pull the trigger. It goes into the trolley and you should feel a haptic pulse.
- Go to checkout: press each belt item (or "Scan …"), choose Cash, press coins and notes, Pay, count the change, then Finish. The results panel appears in VR. Exit VR.
- Hand tracking: pinching should act like the trigger.

## AR

- **Android Chrome (ARCore):** AR Mode → Start AR. Move the phone until a ring appears, tap to place the store, then use the Size and Turn sliders. Place basket → tap a surface. Shop → tap products: a floating label appears and the basket count goes up. Money table → pick ₹10 and tap a surface a few times → Check.
- **iPhone / desktop:** AR Mode → Camera mode. The store sits on a virtual table over the camera feed. Drag to orbit and tap products. In Money table, tap the table to place money. If the camera is denied, a plain backdrop appears after about 4 seconds.
