/**
 * Khalid Yasir (1090684)
 * Ali Al Omaira (1092176)
 * Fares Farghaly (1092169)
 */

class User {
  constructor(userId, firstName, lastName, username, passwordHash, nationalIdNumber, contactNumber, role) {
    this.userId = userId;
    this.firstName = firstName;
    this.lastName = lastName;
    this.username = username;
    this.passwordHash = passwordHash;
    this.nationalIdNumber = nationalIdNumber;
    this.contactNumber = contactNumber;
    this.role = role;
  }

  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  }

  login(username, password) {
    return this.username === username && this.passwordHash === password;
  }

  browseItems(inventory, filters = {}) {
    return inventory.filter(item => {
      if (filters.status && filters.status !== 'all' && item.itemStatus !== filters.status) return false;
      if (filters.category && filters.category !== 'all' && item.category !== filters.category) return false;
      if (filters.type === 'high-value' && !(item instanceof HighValueItem || item.isHighValue)) return false;
      if (filters.type === 'standard' && (item instanceof HighValueItem || item.isHighValue)) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const text = `${item.name} ${item.brand} ${item.color} ${item.description} ${item.storageLocation}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }
}

class NormalUser extends User {
  constructor(userId, firstName, lastName, username, passwordHash, nationalIdNumber, contactNumber) {
    super(userId, firstName, lastName, username, passwordHash, nationalIdNumber, contactNumber, 'Student / Faculty');
  }

  logItem(itemData, inventory) {
    let item;
    if (itemData.isHighValue) {
      item = new HighValueItem(
        itemData.itemId || 'ITEM-' + Date.now().toString().slice(-4),
        itemData.photos || [],
        itemData.name,
        itemData.description,
        itemData.brand,
        itemData.color,
        itemData.storageLocation || 'Main Security Desk - Bin A1',
        itemData.category || 'Electronics',
        itemData.submissionDateTime || new Date().toISOString()
      );
    } else {
      item = new LostItem(
        itemData.itemId || 'ITEM-' + Date.now().toString().slice(-4),
        itemData.photos || [],
        itemData.name,
        itemData.description,
        itemData.brand,
        itemData.color,
        itemData.storageLocation || 'Main Security Desk - Bin A1',
        itemData.category || 'General',
        itemData.submissionDateTime || new Date().toISOString()
      );
    }
    inventory.unshift(item);
    return item;
  }

  claimItem(itemId, proofDetails, inventory) {
    const item = inventory.find(i => i.itemId === itemId);
    if (!item) return { success: false, message: 'Item not found' };
    
    if (item.itemStatus !== 'Available') {
      return { success: false, message: `Item cannot be claimed (current status: ${item.itemStatus})` };
    }

    item.updateStatus('Claim Pending');
    item.claimDetails = {
      claimantId: this.userId,
      claimantName: this.fullName,
      claimantPhone: this.contactNumber,
      proofDetails: proofDetails,
      claimTimestamp: new Date().toISOString()
    };

    return { success: true, item };
  }
}

class StaffUser extends User {
  constructor(userId, firstName, lastName, username, passwordHash, nationalIdNumber, contactNumber, staffBadgeId) {
    super(userId, firstName, lastName, username, passwordHash, nationalIdNumber, contactNumber, 'Campus Security Staff');
    this.staffBadgeId = staffBadgeId;
  }

  assignStorageLocation(itemId, newLocation, inventory) {
    const item = inventory.find(i => i.itemId === itemId);
    if (item) {
      item.storageLocation = newLocation;
      return true;
    }
    return false;
  }

  verifyClaimantProof(itemId, isApproved, staffNotes, inventory) {
    const item = inventory.find(i => i.itemId === itemId);
    if (!item) return false;

    if (isApproved) {
      if (item instanceof HighValueItem || item.isHighValue) {
        item.isVerifiedByStaff = true;
        item.verificationNotes = staffNotes || `Verified by Officer (Badge: ${this.staffBadgeId})`;
      }
      item.updateStatus('Retrieved');
      item.claimedDateTime = new Date().toISOString();
      return true;
    } else {
      item.updateStatus('Available');
      item.verificationNotes = staffNotes || `Claim rejected: Insufficient proof`;
      delete item.claimDetails;
      return false;
    }
  }

  confirmItemRetrieval(itemId, inventory) {
    const item = inventory.find(i => i.itemId === itemId);
    if (item) {
      item.updateStatus('Retrieved');
      item.claimedDateTime = new Date().toISOString();
      return true;
    }
    return false;
  }
}

class LostItem {
  constructor(itemId, photos, name, description, brand, color, storageLocation, category, submissionDateTime) {
    this.itemId = itemId;
    this.photos = Array.isArray(photos) ? photos : [photos];
    this.name = name;
    this.description = description;
    this.brand = brand;
    this.color = color;
    this.storageLocation = storageLocation;
    this.category = category || 'General';
    this.itemStatus = 'Available';
    this.submissionDateTime = submissionDateTime || new Date().toISOString();
    this.claimedDateTime = null;
    this.isHighValue = false;
    this.turnoverDate = this.calculateTurnoverDate();
  }

  calculateTurnoverDate() {
    const subDate = new Date(this.submissionDateTime);
    const turnover = new Date(subDate);
    turnover.setDate(turnover.getDate() + 90);
    return turnover.toISOString();
  }

  updateStatus(newStatus) {
    this.itemStatus = newStatus;
  }

  getDaysRemaining() {
    const now = new Date();
    const turnover = new Date(this.turnoverDate);
    const diffMs = turnover - now;
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return { hours: diffHours, days: diffDays, expired: diffMs <= 0 };
  }
}

class HighValueItem extends LostItem {
  constructor(itemId, photos, name, description, brand, color, storageLocation, category, submissionDateTime) {
    super(itemId, photos, name, description, brand, color, storageLocation, category, submissionDateTime);
    this.isHighValue = true;
    this.userVerificationRequired = true;
    this.isVerifiedByStaff = false;
    this.verificationNotes = '';
    this.turnoverDate = this.calculateTurnoverDate();
  }

  calculateTurnoverDate() {
    const subDate = new Date(this.submissionDateTime);
    const turnover = new Date(subDate);
    turnover.setHours(turnover.getHours() + 24);
    return turnover.toISOString();
  }

  verifyOwnership(staff, proofDetails) {
    if (!staff || !(staff instanceof StaffUser)) return false;
    this.isVerifiedByStaff = true;
    this.verificationNotes = `Verified by Staff ${staff.fullName} (Badge: ${staff.staffBadgeId}). Proof: ${proofDetails}`;
    this.updateStatus('Retrieved');
    this.claimedDateTime = new Date().toISOString();
    return true;
  }
}

class AITaggingService {
  constructor(modelVersion = 'gemini-1.5-flash') {
    this.modelVersion = modelVersion;
  }

  async extractVisualTags(photoUrlOrType) {
    await new Promise(r => setTimeout(r, 500));

    if (photoUrlOrType.includes('backpack')) {
      return {
        brand: 'Nike',
        color: 'Black',
        category: 'Personal Accessories',
        name: 'Nike Sport Backpack (Black)',
        tags: ['backpack', 'black', 'zippered', 'laptop compartment'],
        isHighValue: false,
        confidence: 0.95,
        description: 'Black dual-compartment Nike backpack with side mesh water bottle pocket.'
      };
    } else if (photoUrlOrType.includes('airpods')) {
      return {
        brand: 'Apple',
        color: 'White',
        category: 'Electronics',
        name: 'Apple AirPods Pro (2nd Gen)',
        tags: ['earbuds', 'apple', 'charging case', 'wireless'],
        isHighValue: true,
        confidence: 0.98,
        description: 'White MagSafe charging case with small mark near LED. High-value item.'
      };
    } else if (photoUrlOrType.includes('calculator')) {
      return {
        brand: 'Casio',
        color: 'Black',
        category: 'Stationery',
        name: 'Casio fx-991EX Calculator',
        tags: ['calculator', 'scientific', 'solar panel'],
        isHighValue: false,
        confidence: 0.96,
        description: 'Black scientific calculator with slide cover and solar cell.'
      };
    } else {
      return {
        brand: 'Campus Item',
        color: 'Dark Tone',
        category: 'Personal Accessories',
        name: 'Detected Personal Belonging',
        tags: ['campus', 'lost item'],
        isHighValue: false,
        confidence: 0.89,
        description: 'Auto-detected item from uploaded photograph.'
      };
    }
  }
}

class AISearchAgent {
  constructor(agentModel = 'claude-3-5-sonnet') {
    this.agentModel = agentModel;
    this.conversationHistory = [];
    this.activeCandidates = [];
  }

  async processQuery(userText, inventory) {
    this.conversationHistory.push({ role: 'user', content: userText });
    const query = userText.toLowerCase();

    const words = query.split(/\s+/).filter(w => w.length > 2);

    const scored = inventory
      .filter(item => {
        if (item.itemStatus === 'Retrieved' || item.itemStatus === 'Escalated to Police') return false;
        const combined = `${item.name} ${item.description} ${item.brand} ${item.color} ${item.category} ${item.storageLocation}`.toLowerCase();
        return words.some(w => combined.includes(w));
      })
      .map(item => {
        const combined = `${item.name} ${item.description} ${item.brand} ${item.color} ${item.category} ${item.storageLocation}`.toLowerCase();
        let score = 0;
        words.forEach(w => { if (combined.includes(w)) score += combined.split(w).length - 1; });
        return { item, score };
      });

    scored.sort((a, b) => b.score - a.score);
    const matches = scored.map(s => s.item);

    this.activeCandidates = matches;

    if (matches.length === 0) {
      const response = {
        message: `NO MATCH FOUND\n\nI searched the Main Campus inventory but could not find a match for "${userText}".\n\nTry specifying:\n- Brand or primary color\n- Specific building (e.g. Main Library, Engineering Lab 204, Cafeteria)\n- Unique stickers or accessories`,
        candidates: [],
        needsDisambiguation: false,
        noMatch: true
      };
      this.conversationHistory.push({ role: 'assistant', content: response.message });
      return response;
    }

    if (matches.length === 1) {
      const match = matches[0];
      const response = {
        message: `I located a matching item in the campus inventory: **${match.name}**.\n\n- **Storage Location:** ${match.storageLocation}\n- **Status:** ${match.itemStatus}\n\nYou can view the candidate card on the right and click **"Claim This Item"** to submit your proof to Campus Security.`,
        candidates: matches,
        needsDisambiguation: false
      };
      this.conversationHistory.push({ role: 'assistant', content: response.message });
      return response;
    }

    if (matches.length > 1) {
      const brands = [...new Set(matches.map(m => m.brand))].filter(Boolean);
      let followUp = `I found **${matches.length} similar items** in the Main Campus storage that might be yours.`;
      followUp += `\n\nTo narrow it down:`;
      if (brands.length > 1) {
        followUp += `\n1. What is the brand (e.g. ${brands.join(' or ')})?`;
      } else {
        followUp += `\n1. Are there any stickers, scratches, or unique marks on it?`;
      }
      followUp += `\n2. In which Main Campus building did you leave it?`;
      followUp += `\n3. What lid/case or interior item can confirm ownership?`;

      const response = {
        message: followUp,
        candidates: matches,
        needsDisambiguation: true
      };
      this.conversationHistory.push({ role: 'assistant', content: response.message });
      return response;
    }
  }

  async refineWithAnswer(userAnswer, inventory) {
    this.conversationHistory.push({ role: 'user', content: userAnswer });
    const answer = userAnswer.toLowerCase();

    const scored = this.activeCandidates.map(candidate => {
      let score = 0;
      const fullText = `${candidate.name} ${candidate.description} ${candidate.brand} ${candidate.color} ${candidate.storageLocation}`.toLowerCase();
      const words = answer.split(/\s+/).filter(w => w.length > 2);
      words.forEach(word => {
        if (fullText.includes(word)) score += 2;
      });
      return { candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const topScored = scored.filter(s => s.score > 0);

    if (topScored.length === 1 || (topScored.length > 1 && topScored[0].score > topScored[1].score)) {
      const best = topScored[0].candidate;
      this.activeCandidates = [best];
      const response = {
        message: `Match narrowed down! Based on your details, this matches **${best.name}** (${best.brand}, ${best.color}).\n\n- **Found at:** ${best.storageLocation}\n- Click **"Claim This Item"** on the right to complete verification with Campus Security.`,
        candidates: [best],
        needsDisambiguation: false
      };
      this.conversationHistory.push({ role: 'assistant', content: response.message });
      return response;
    } else {
      const remaining = topScored.length > 0 ? topScored.map(s => s.candidate) : this.activeCandidates;
      this.activeCandidates = remaining;
      const response = {
        message: `I have narrowed down the results to **${remaining.length} items** shown on the right. Please click on your item to file your claim.`,
        candidates: remaining,
        needsDisambiguation: false
      };
      this.conversationHistory.push({ role: 'assistant', content: response.message });
      return response;
    }
  }
}

const ADU_MAIN_CAMPUS_DATA = [
  {
    itemId: 'ITEM-801',
    name: 'Hydro Flask Water Bottle',
    category: 'Personal Accessories',
    brand: 'Hydro Flask',
    color: 'Matte Black',
    description: 'Black insulated flask with silver lid and ADU Robotics Club sticker.',
    storageLocation: 'Main Library - Security Shelf B1',
    itemStatus: 'Available',
    isHighValue: false,
    submissionDateTime: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    photos: ['https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80']
  },
  {
    itemId: 'ITEM-802',
    name: 'CamelBak Chute Bottle',
    category: 'Personal Accessories',
    brand: 'CamelBak',
    color: 'Matte Black',
    description: 'Black sports water bottle with magnetic handle. Found near cardio equipment.',
    storageLocation: 'Sports Complex - Security Cabinet 3',
    itemStatus: 'Available',
    isHighValue: false,
    submissionDateTime: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    photos: ['https://images.unsplash.com/photo-1544003484-3cd181d17917?auto=format&fit=crop&w=400&q=80']
  },
  {
    itemId: 'ITEM-803',
    name: 'Apple MacBook Air 13" (M2)',
    category: 'Electronics',
    brand: 'Apple',
    color: 'Space Gray',
    description: 'Space Gray MacBook Air M2. Has an ADU CSIT sticker on bottom left.',
    storageLocation: 'College of Engineering - Safe Cabinet A',
    itemStatus: 'Available',
    isHighValue: true,
    submissionDateTime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    photos: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=400&q=80']
  },
  {
    itemId: 'ITEM-804',
    name: 'Sony WH-1000XM5 Headphones',
    category: 'Electronics',
    brand: 'Sony',
    color: 'Silver',
    description: 'Over-ear noise cancelling wireless headphones with light gray carrying case.',
    storageLocation: 'Student Hub - Security Desk',
    itemStatus: 'Claim Pending',
    isHighValue: true,
    submissionDateTime: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
    claimDetails: {
      claimantId: '1092169',
      claimantName: 'Fares Farghaly',
      claimantPhone: '0568011077',
      proofDetails: 'Bluetooth pairing name is "Fares Sony XM5", invoice from Virgin Megastore.',
      claimTimestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    },
    photos: ['https://images.unsplash.com/photo-1546435770-a3e426bf472b?auto=format&fit=crop&w=400&q=80']
  },
  {
    itemId: 'ITEM-805',
    name: 'ADU University Athletics Hoodie',
    category: 'Clothing',
    brand: 'Abu Dhabi University Athletics',
    color: 'Navy Blue',
    description: 'Size L Navy Blue hoodie with embroidered Abu Dhabi University logo.',
    storageLocation: 'Main Campus Security Gate',
    itemStatus: 'Available',
    isHighValue: false,
    submissionDateTime: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    photos: ['https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=400&q=80']
  },
  {
    itemId: 'ITEM-806',
    name: 'Casio fx-991EX Calculator',
    category: 'Stationery',
    brand: 'Casio',
    color: 'Black',
    description: 'Black scientific calculator with solar panel, student name etched on back cover.',
    storageLocation: 'Main Library - Level 2 Reception',
    itemStatus: 'Available',
    isHighValue: false,
    submissionDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    photos: ['https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=400&q=80']
  }
];

class FindAIApp {
  constructor() {
    this.geminiVision = new AITaggingService('gemini-1.5-flash');
    this.claudeAgent = new AISearchAgent('claude-3-5-sonnet');
    
    this.accounts = {
      student: new NormalUser('1092169', 'Fares', 'Farghaly', 'fares', '123', '784-1998-1234567-1', '0568011077'),
      staff: new StaffUser('SEC-401', 'Campus Security', 'Officer', 'staff', '123', '784-1985-0011223-9', '02-501-5555', 'SEC-401')
    };

    this.customUsers = [];
    this.loadCustomUsers();

    this.currentUser = null;
    this.loginType = 'student';
    this.registerRole = 'student';
    this.currentTab = 'search';
    this.inventory = [];

    this.init();
  }

  loadCustomUsers() {
    const saved = localStorage.getItem('findai_custom_users');
    if (saved) {
      try {
        const raw = JSON.parse(saved);
        this.customUsers = raw.map(u => {
          if (u.role === 'Campus Security Staff') {
            return new StaffUser(u.userId, u.firstName, u.lastName, u.username, u.passwordHash, u.nationalIdNumber, u.contactNumber, u.staffBadgeId || u.userId);
          } else {
            return new NormalUser(u.userId, u.firstName, u.lastName, u.username, u.passwordHash, u.nationalIdNumber, u.contactNumber);
          }
        });
      } catch (e) {
        this.customUsers = [];
      }
    }
  }

  saveCustomUsers() {
    localStorage.setItem('findai_custom_users', JSON.stringify(this.customUsers));
  }

  init() {
    this.loadInventory();
    
    const savedUser = sessionStorage.getItem('findai_user');
    if (savedUser === 'staff') {
      this.currentUser = this.accounts.staff;
      this.showAppView();
    } else if (savedUser === 'student') {
      this.currentUser = this.accounts.student;
      this.showAppView();
    } else if (savedUser) {
      const found = this.customUsers.find(u => u.username === savedUser);
      if (found) {
        this.currentUser = found;
        this.showAppView();
      } else {
        this.showLoginView();
      }
    } else {
      this.showLoginView();
    }
  }

  toggleAuthMode(mode) {
    const tabSignIn = document.getElementById('auth-tab-signin');
    const tabRegister = document.getElementById('auth-tab-register');
    const formLogin = document.getElementById('login-form');
    const formRegister = document.getElementById('register-form');

    if (mode === 'signin') {
      tabSignIn.className = "py-2 rounded-md bg-white text-adu-maroon shadow-sm transition";
      tabRegister.className = "py-2 rounded-md text-slate-600 hover:text-slate-900 transition";
      formLogin?.classList.remove('hidden');
      formRegister?.classList.add('hidden');
    } else {
      tabRegister.className = "py-2 rounded-md bg-white text-adu-maroon shadow-sm transition";
      tabSignIn.className = "py-2 rounded-md text-slate-600 hover:text-slate-900 transition";
      formRegister?.classList.remove('hidden');
      formLogin?.classList.add('hidden');
    }
  }

  setRegisterRole(role) {
    this.registerRole = role;
    const btnStudent = document.getElementById('reg-role-student');
    const btnStaff = document.getElementById('reg-role-staff');
    const idLabel = document.getElementById('reg-id-label');
    const idInput = document.getElementById('reg-id');

    if (role === 'student') {
      btnStudent.className = "py-2 px-2 text-xs font-bold rounded-lg border-2 border-adu-maroon bg-adu-maroon text-white transition";
      btnStaff.className = "py-2 px-2 text-xs font-bold rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition";
      if (idLabel) idLabel.innerText = "Student ID *";
      if (idInput) idInput.placeholder = "e.g. 1092169";
    } else {
      btnStaff.className = "py-2 px-2 text-xs font-bold rounded-lg border-2 border-adu-maroon bg-adu-maroon text-white transition";
      btnStudent.className = "py-2 px-2 text-xs font-bold rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition";
      if (idLabel) idLabel.innerText = "Staff Badge ID *";
      if (idInput) idInput.placeholder = "e.g. SEC-405";
    }
    document.getElementById('register-error-msg')?.classList.add('hidden');
  }

  handleRegisterSubmit(event) {
    event.preventDefault();
    const firstName = document.getElementById('reg-first-name').value.trim();
    const lastName = document.getElementById('reg-last-name').value.trim();
    const idVal = document.getElementById('reg-id').value.trim();
    const nationalId = document.getElementById('reg-national-id').value.trim();
    const phone = document.getElementById('reg-phone').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value.trim();
    const errorEl = document.getElementById('register-error-msg');

    const exists = Object.values(this.accounts).some(a => a.username === username) ||
                   this.customUsers.some(u => u.username === username);
    if (exists) {
      if (errorEl) {
        errorEl.innerText = "This username is already taken. Please choose another.";
        errorEl.classList.remove('hidden');
      }
      return;
    }

    let newUser;
    if (this.registerRole === 'staff') {
      newUser = new StaffUser(idVal, firstName, lastName, username, password, nationalId, phone, idVal);
    } else {
      newUser = new NormalUser(idVal, firstName, lastName, username, password, nationalId, phone);
    }

    this.customUsers.push(newUser);
    this.saveCustomUsers();

    alert(`Account created successfully for ${newUser.fullName} (${newUser.role})!\n\nLogging you in now.`);

    this.currentUser = newUser;
    sessionStorage.setItem('findai_user', username);
    this.showAppView();
    this.logActivity('AUTH', `New user registered & signed in: ${newUser.fullName} [${newUser.role}]`);
  }

  showLoginView() {
    document.getElementById('login-view')?.classList.remove('hidden');
    document.getElementById('app-view')?.classList.add('hidden');
    this.setLoginType('student');
  }

  showAppView() {
    document.getElementById('login-view')?.classList.add('hidden');
    document.getElementById('app-view')?.classList.remove('hidden');

    const nameEl = document.getElementById('session-user-name');
    const roleEl = document.getElementById('session-user-role');
    const badgeEl = document.getElementById('session-badge');
    const staffTab = document.getElementById('tab-staff');
    const logTab = document.getElementById('tab-log');

    if (nameEl) nameEl.innerText = this.currentUser.fullName;

    if (this.currentUser instanceof StaffUser) {
      if (roleEl) roleEl.innerText = `Campus Security Staff | Badge ${this.currentUser.staffBadgeId}`;
      if (badgeEl) {
        badgeEl.innerText = 'Security Staff';
        badgeEl.className = 'px-2.5 py-1 rounded text-xs font-bold bg-slate-800 text-white';
      }
      if (staffTab) staffTab.classList.remove('hidden');
      if (logTab) logTab.classList.remove('hidden');
      this.switchTab('staff');
    } else {
      if (roleEl) roleEl.innerText = `Student | ID ${this.currentUser.userId}`;
      if (badgeEl) {
        badgeEl.innerText = 'Student / Faculty';
        badgeEl.className = 'px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-800';
      }
      if (staffTab) staffTab.classList.add('hidden');
      if (logTab) logTab.classList.add('hidden');
      this.switchTab('search');
    }

    this.initChatSession();
    this.renderInventory();
    this.renderStaffDashboard();
    this.updateCounters();
  }

  setLoginType(type) {
    this.loginType = type;
    const btnStudent = document.getElementById('login-type-student');
    const btnStaff = document.getElementById('login-type-staff');
    const userInput = document.getElementById('login-username');
    const passInput = document.getElementById('login-password');

    if (type === 'student') {
      btnStudent.className = "py-2.5 px-3 text-xs font-bold rounded-lg border-2 border-adu-maroon bg-adu-maroon text-white transition";
      btnStaff.className = "py-2.5 px-3 text-xs font-bold rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition";
      if (userInput) userInput.value = 'fares';
      if (passInput) passInput.value = '123';
    } else {
      btnStaff.className = "py-2.5 px-3 text-xs font-bold rounded-lg border-2 border-adu-maroon bg-adu-maroon text-white transition";
      btnStudent.className = "py-2.5 px-3 text-xs font-bold rounded-lg border-2 border-slate-200 bg-white text-slate-600 hover:border-slate-300 transition";
      if (userInput) userInput.value = 'staff';
      if (passInput) passInput.value = '123';
    }
    document.getElementById('login-error-msg')?.classList.add('hidden');
  }

  quickLogin(type) {
    this.setLoginType(type);
    const user = this.accounts[type];
    this.currentUser = user;
    sessionStorage.setItem('findai_user', type);
    this.showAppView();
    this.logActivity('AUTH', `Signed in as ${user.fullName} (${user.role})`);
  }

  handleLoginSubmit(event) {
    event.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value.trim();

    let target = Object.values(this.accounts).find(a => a.username.toLowerCase() === u.toLowerCase());
    
    if (!target) {
      target = this.customUsers.find(a => a.username.toLowerCase() === u.toLowerCase());
    }

    if (target && target.login(u, p)) {
      this.currentUser = target;
      sessionStorage.setItem('findai_user', target.username);
      this.showAppView();
      this.logActivity('AUTH', `Signed in as ${target.fullName} [${target.role}]`);
    } else {
      document.getElementById('login-error-msg')?.classList.remove('hidden');
    }
  }

  logout() {
    sessionStorage.removeItem('findai_user');
    this.currentUser = null;
    this.showLoginView();
  }

  loadInventory() {
    const saved = localStorage.getItem('findai_main_inventory');
    if (saved) {
      try {
        const raw = JSON.parse(saved);
        this.inventory = raw.map(d => {
          if (d.isHighValue) {
            const h = new HighValueItem(d.itemId, d.photos, d.name, d.description, d.brand, d.color, d.storageLocation, d.category, d.submissionDateTime);
            h.itemStatus = d.itemStatus;
            h.claimDetails = d.claimDetails;
            h.isVerifiedByStaff = d.isVerifiedByStaff || false;
            return h;
          } else {
            const l = new LostItem(d.itemId, d.photos, d.name, d.description, d.brand, d.color, d.storageLocation, d.category, d.submissionDateTime);
            l.itemStatus = d.itemStatus;
            l.claimDetails = d.claimDetails;
            return l;
          }
        });
      } catch (e) {
        this.resetData();
      }
    } else {
      this.resetData();
    }
    this.updateCounters();
  }

  saveInventory() {
    localStorage.setItem('findai_main_inventory', JSON.stringify(this.inventory));
    this.updateCounters();
  }

  resetData() {
    this.inventory = ADU_MAIN_CAMPUS_DATA.map(d => {
      if (d.isHighValue) {
        const item = new HighValueItem(d.itemId, d.photos, d.name, d.description, d.brand, d.color, d.storageLocation, d.category, d.submissionDateTime);
        item.itemStatus = d.itemStatus;
        item.claimDetails = d.claimDetails;
        return item;
      } else {
        const item = new LostItem(d.itemId, d.photos, d.name, d.description, d.brand, d.color, d.storageLocation, d.category, d.submissionDateTime);
        item.itemStatus = d.itemStatus;
        item.claimDetails = d.claimDetails;
        return item;
      }
    });
    this.saveInventory();
    this.renderInventory();
    this.renderStaffDashboard();
    this.logActivity('STORAGE', 'Reset to Abu Dhabi University Main Campus starter items.');
  }

  updateCounters() {
    const invCount = document.getElementById('inventory-count-badge');
    if (invCount) invCount.innerText = this.inventory.length;

    const pending = this.inventory.filter(i => i.itemStatus === 'Claim Pending').length;
    const badge = document.getElementById('staff-pending-badge');
    if (badge) {
      if (pending > 0) {
        badge.classList.remove('hidden');
        badge.innerText = pending;
      } else {
        badge.classList.add('hidden');
      }
    }
  }

  switchTab(tabId) {
    if (tabId === 'staff' && !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can access claim reviews.");
      return;
    }

    if (tabId === 'log' && !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can report found items.");
      return;
    }

    this.currentTab = tabId;
    const tabs = ['search', 'inventory', 'log', 'staff', 'collaboration'];
    tabs.forEach(t => {
      const v = document.getElementById(`view-${t}`);
      const btn = document.getElementById(`tab-${t}`);
      if (t === tabId) {
        v?.classList.remove('hidden');
        if (btn) btn.className = "nav-tab px-3.5 py-1.5 rounded-lg bg-adu-maroon text-white transition flex items-center gap-1.5";
      } else {
        v?.classList.add('hidden');
        if (btn) btn.className = "nav-tab px-3.5 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition flex items-center gap-1.5";
      }
    });

    if (tabId === 'inventory') this.renderInventory();
    if (tabId === 'staff') this.renderStaffDashboard();
  }

  initChatSession() {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = `
      <div class="flex items-start gap-2.5">
        <div class="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">
          C
        </div>
        <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 shadow-sm max-w-md">
          <p class="font-bold text-slate-900 mb-1">Hello ${this.currentUser.firstName}!</p>
          <p>I am the <strong>FindAI Main Campus Assistant</strong>. Describe what you lost (e.g. brand, color, where you left it), and I will check active storage and ask clarifying questions if multiple items match.</p>
        </div>
      </div>
    `;
    this.renderCandidates([]);
  }

  editLastQuery() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const history = this.claudeAgent.conversationHistory;
    const lastUser = [...history].reverse().find(h => h.role === 'user');
    if (lastUser) input.value = lastUser.content;
    input.focus();
    this.claudeAgent = new AISearchAgent('claude-3-5-sonnet');
  }

  clearChat() {
    this.claudeAgent = new AISearchAgent('claude-3-5-sonnet');
    this.initChatSession();
  }

  sendPresetQuery(query) {
    const input = document.getElementById('chat-input');
    if (input) {
      input.value = query;
      this.handleUserMessage(new Event('submit'));
    }
  }

  async handleUserMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    input.value = '';
    const container = document.getElementById('chat-messages');

    container.innerHTML += `
      <div class="flex items-start justify-end gap-2.5">
        <div class="bg-adu-maroon text-white rounded-lg p-2.5 text-xs max-w-sm">
          ${text}
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;

    const typingId = 'typing-' + Date.now();
    container.innerHTML += `
      <div id="${typingId}" class="flex items-start gap-2.5">
        <div class="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">C</div>
        <div class="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-400">
          Claude checking inventory...
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;

    let response;
    if (this.claudeAgent.activeCandidates.length > 1) {
      response = await this.claudeAgent.refineWithAnswer(text, this.inventory);
    } else {
      response = await this.claudeAgent.processQuery(text, this.inventory);
    }

    document.getElementById(typingId)?.remove();

    const formatted = response.message.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    container.innerHTML += `
      <div class="flex items-start gap-2.5">
        <div class="w-6 h-6 rounded bg-amber-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0">C</div>
        <div class="bg-white border border-slate-200 rounded-lg p-3 text-xs text-slate-700 shadow-sm max-w-md">
          ${response.noMatch ? `<p class="font-bold text-red-600 mb-1">NO MATCH FOUND</p>` : ''}
          ${formatted}
          ${response.noMatch ? `
            <div class="mt-2">
              <button onclick="app.editLastQuery()" class="bg-adu-maroon hover:bg-adu-dark text-white px-3 py-1.5 rounded text-[11px] font-bold">
                Edit Description
              </button>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    container.scrollTop = container.scrollHeight;

    this.renderCandidates(response.candidates);
  }

  renderCandidates(candidates) {
    const container = document.getElementById('candidates-container');
    const countTag = document.getElementById('candidate-count-tag');
    if (!container) return;

    if (countTag) countTag.innerText = `${candidates.length} found`;

    if (candidates.length === 0) {
      container.innerHTML = `
        <div class="text-center py-10 text-slate-400 text-xs">
          <p class="font-medium text-slate-600">No candidates match this search</p>
        </div>
      `;
      return;
    }

    container.innerHTML = candidates.map(item => `
      <div class="border border-slate-200 rounded-lg p-3 bg-white flex gap-3 shadow-sm text-xs">
        <img src="${item.photos[0]}" class="w-16 h-16 rounded object-cover border border-slate-200 flex-shrink-0">
        <div class="flex-grow min-w-0">
          <div class="flex items-start justify-between">
            <h4 class="font-bold text-slate-900 truncate">${item.name}</h4>
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${item.isHighValue ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}">
              ${item.isHighValue ? 'High-Value' : 'Standard'}
            </span>
          </div>
          <p class="text-slate-500 text-[11px] mt-0.5">${item.brand || 'Unbranded'} | ${item.color}</p>
          <p class="text-slate-500 text-[11px] mt-0.5">${item.category}</p>
          <p class="text-slate-600 text-[11px] truncate mt-0.5"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${item.storageLocation}</p>
          
          <div class="mt-2 flex items-center justify-between">
            <span class="text-[10px] font-semibold text-emerald-600">${item.itemStatus}</span>
            ${item.itemStatus === 'Available' ? `
              <button onclick="app.openClaimModal('${item.itemId}')" class="bg-adu-maroon hover:bg-adu-dark text-white px-2.5 py-1 rounded text-[11px] font-bold">
                Claim Item
              </button>
            ` : '<span class="text-[10px] text-slate-400">Claim in Review</span>'}
          </div>
        </div>
      </div>
    `).join('');
  }

  renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;

    const search = document.getElementById('inventory-search-input')?.value || '';
    const category = document.getElementById('filter-category')?.value || 'all';
    const type = document.getElementById('filter-type')?.value || 'all';
    const status = document.getElementById('filter-status')?.value || 'all';

    const items = this.currentUser ? this.currentUser.browseItems(this.inventory, { search, category, type, status }) : this.inventory;

    if (items.length === 0) {
      grid.innerHTML = `<div class="col-span-full py-12 text-center text-slate-400 text-xs">No matching inventory items.</div>`;
      return;
    }

    grid.innerHTML = items.map(item => {
      const isHigh = item.isHighValue || item instanceof HighValueItem;
      const timing = item.getDaysRemaining();

      return `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col text-xs">
          <div class="relative h-40 bg-slate-100">
            <img src="${item.photos[0]}" class="w-full h-full object-cover">
            <div class="absolute top-2 left-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${isHigh ? 'bg-purple-600 text-white' : 'bg-slate-700 text-white'}">
                ${isHigh ? 'High-Value (24h rule)' : 'Standard (90d)'}
              </span>
            </div>
            <div class="absolute top-2 right-2">
              <span class="text-[10px] font-bold px-2 py-0.5 rounded ${item.itemStatus === 'Available' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'}">
                ${item.itemStatus}
              </span>
            </div>
          </div>

          <div class="p-3.5 flex-grow flex flex-col justify-between">
            <div>
              <span class="text-[10px] font-bold text-adu-maroon uppercase">${item.category} | ${item.itemId}</span>
              <h3 class="font-bold text-slate-900 text-sm mt-0.5">${item.name}</h3>
              <p class="text-slate-500 text-[11px] mt-0.5">${item.brand || 'Unbranded'} | ${item.color}</p>
              ${(this.currentUser instanceof StaffUser) ? `<p class="text-slate-600 mt-2 line-clamp-2 text-[11px]">${item.description}</p>` : `<p class="text-slate-400 mt-2 text-[11px] italic">Description visible to staff only (privacy protection)</p>`}
            </div>

            <div class="mt-3 pt-2 border-t border-slate-100">
              <div class="text-[11px] text-slate-500 mb-2">
                <i class="fa-solid fa-location-dot text-slate-400 mr-1"></i>${item.storageLocation}
              </div>

              ${item.itemStatus === 'Available' ? `
                <button onclick="app.openClaimModal('${item.itemId}')" class="w-full bg-adu-maroon hover:bg-adu-dark text-white py-1.5 rounded font-bold text-xs transition">
                  Claim This Item
                </button>
              ` : `
                <div class="w-full text-center py-1 bg-slate-100 text-slate-600 font-semibold rounded text-[11px]">
                  ${item.itemStatus}
                </div>
              `}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  filterInventory() {
    this.renderInventory();
  }

  async handleImageSelection(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      this.displayPreview(e.target.result);
      await this.runGeminiScan(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  async loadSampleImage(type) {
    let url = '';
    if (type === 'backpack') url = 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=80';
    if (type === 'airpods') url = 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?auto=format&fit=crop&w=400&q=80';
    if (type === 'calculator') url = 'https://images.unsplash.com/photo-1594980596870-8aa52a78d8cd?auto=format&fit=crop&w=400&q=80';

    this.displayPreview(url);
    await this.runGeminiScan(type);
  }

  displayPreview(url) {
    document.getElementById('image-preview-wrapper')?.classList.add('hidden');
    document.getElementById('image-preview-display')?.classList.remove('hidden');
    const img = document.getElementById('preview-img-element');
    if (img) img.src = url;
    this.currentUploadPhotoUrl = url;
  }

  async runGeminiScan(ref) {
    const nameEl = document.getElementById('ai-detected-name');
    const tagsContainer = document.getElementById('ai-tags-container');

    if (nameEl) nameEl.innerText = "Scanning with Gemini Vision...";
    const res = await this.geminiVision.extractVisualTags(ref);

    if (nameEl) nameEl.innerText = res.name;
    if (tagsContainer) {
      tagsContainer.innerHTML = res.tags.map(t => `<span class="bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px]">#${t}</span>`).join('');
    }

    document.getElementById('log-name').value = res.name;
    document.getElementById('log-category').value = res.category;
    document.getElementById('log-brand').value = res.brand;
    document.getElementById('log-color').value = res.color;
    document.getElementById('log-desc').value = res.description;
    document.getElementById('log-is-high-value').checked = res.isHighValue;

    this.logActivity('GEMINI', `Analyzed photo: detected ${res.brand} ${res.name}`);
  }

  handleItemSubmit(event) {
    event.preventDefault();

    const name = document.getElementById('log-name').value;
    const category = document.getElementById('log-category').value;
    const brand = document.getElementById('log-brand').value;
    const color = document.getElementById('log-color').value;
    const locationFound = document.getElementById('log-location').value;
    const storageLocation = document.getElementById('log-storage').value;
    const description = document.getElementById('log-desc').value;
    const isHighValue = document.getElementById('log-is-high-value').checked;

    const photoUrl = this.currentUploadPhotoUrl || 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=400&q=80';

    const itemData = {
      itemId: 'ITEM-' + Math.floor(100 + Math.random() * 900),
      name,
      category,
      brand,
      color,
      storageLocation: `${storageLocation} (${locationFound})`,
      description,
      isHighValue,
      photos: [photoUrl],
      submissionDateTime: new Date().toISOString()
    };

    let created;
    if (this.currentUser instanceof NormalUser) {
      created = this.currentUser.logItem(itemData, this.inventory);
    } else {
      created = this.accounts.student.logItem(itemData, this.inventory);
    }

    this.saveInventory();
    alert(`Item registered into Main Campus storage.\nID: ${created.itemId}\nType: ${isHighValue ? 'High-Value (24h rule)' : 'Standard (90d retention)'}`);

    event.target.reset();
    document.getElementById('image-preview-wrapper')?.classList.remove('hidden');
    document.getElementById('image-preview-display')?.classList.add('hidden');
    this.currentUploadPhotoUrl = null;

    this.switchTab('inventory');
  }

  renderStaffDashboard() {
    if (!this.currentUser || !(this.currentUser instanceof StaffUser)) {
      const tableBody = document.getElementById('claims-table-body');
      if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="6" class="p-6 text-center text-red-600 font-bold">Access Restricted: Only Campus Security Staff can review and verify claims.</td></tr>`;
      }
      return;
    }

    const tableBody = document.getElementById('claims-table-body');
    if (!tableBody) return;

    const pending = this.inventory.filter(i => i.itemStatus === 'Claim Pending');
    const highVal = this.inventory.filter(i => i.isHighValue && i.itemStatus !== 'Retrieved');
    const retrieved = this.inventory.filter(i => i.itemStatus === 'Retrieved');
    const escalated = this.inventory.filter(i => i.itemStatus === 'Escalated to Police');

    document.getElementById('stat-pending-claims').innerText = pending.length;
    document.getElementById('stat-high-value').innerText = highVal.length;
    document.getElementById('stat-retrieved').innerText = retrieved.length;
    document.getElementById('stat-escalated').innerText = escalated.length;

    tableBody.innerHTML = this.inventory.map(item => {
      const isHigh = item.isHighValue || item instanceof HighValueItem;
      const timing = item.getDaysRemaining();
      const claim = item.claimDetails;

      return `
        <tr class="hover:bg-slate-50">
          <td class="py-2.5 px-3">
            <div class="flex items-center gap-2">
              <img src="${item.photos[0]}" class="w-8 h-8 rounded object-cover border border-slate-200">
              <div>
                <span class="font-bold text-slate-900 block">${item.name}</span>
                <span class="text-[10px] text-slate-400">${item.itemId}</span>
              </div>
            </div>
          </td>

          <td class="py-2.5 px-3">
            ${claim ? `
              <span class="font-bold text-slate-800 block">${claim.claimantName}</span>
              <span class="text-[10px] text-slate-500">ID: ${claim.claimantId}</span>
            ` : '<span class="text-slate-400 italic">No claimant</span>'}
          </td>

          <td class="py-2.5 px-3 max-w-xs">
            ${claim ? `
              <p class="text-[11px] text-slate-700 bg-slate-100 p-1.5 rounded border border-slate-200">${claim.proofDetails}</p>
            ` : '<span class="text-slate-400">-</span>'}
          </td>

          <td class="py-2.5 px-3">
            <input type="text" value="${item.storageLocation}" onchange="app.updateLocation('${item.itemId}', this.value)" 
              class="text-xs bg-slate-50 px-2 py-1 rounded border border-slate-200 w-36">
          </td>

          <td class="py-2.5 px-3">
            <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${isHigh ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}">
              ${isHigh ? 'High-Value' : 'Standard'}
            </span>
            <div class="text-[10px] text-slate-500 mt-0.5">${timing.hours}h left</div>
          </td>

          <td class="py-2.5 px-3 text-right whitespace-nowrap">
            ${item.itemStatus === 'Claim Pending' ? `
              <button onclick="app.verifyProof('${item.itemId}', true)" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1 rounded text-[11px]">
                Approve
              </button>
              <button onclick="app.verifyProof('${item.itemId}', false)" class="bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-1 rounded text-[11px] ml-1">
                Reject
              </button>
            ` : item.itemStatus === 'Available' ? `
              <span class="text-slate-400 text-[10px]">Ready</span>
            ` : `
              <span class="text-emerald-700 font-bold text-[10px]">Retrieved</span>
            `}
            <button onclick="app.openEditModal('${item.itemId}')" class="bg-blue-50 text-blue-700 border border-blue-200 font-bold px-2 py-1 rounded text-[11px] ml-1 mt-1">
              Edit
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  openEditModal(itemId) {
    if (!this.currentUser || !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can edit item attributes.");
      return;
    }
    const item = this.inventory.find(i => i.itemId === itemId);
    if (!item) return;

    document.getElementById('edit-item-id').value = itemId;
    document.getElementById('edit-name').value = item.name;
    document.getElementById('edit-brand').value = item.brand || '';
    document.getElementById('edit-color').value = item.color || '';
    document.getElementById('edit-category').value = item.category || 'General';
    document.getElementById('edit-storage').value = item.storageLocation || '';
    document.getElementById('edit-desc').value = item.description || '';
    document.getElementById('edit-modal')?.classList.remove('hidden');
  }

  closeEditModal() {
    document.getElementById('edit-modal')?.classList.add('hidden');
  }

  submitEdit(event) {
    event.preventDefault();
    if (!this.currentUser || !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can edit item attributes.");
      return;
    }
    const itemId = document.getElementById('edit-item-id').value;
    const item = this.inventory.find(i => i.itemId === itemId);
    if (!item) return;

    item.name = document.getElementById('edit-name').value.trim() || item.name;
    item.brand = document.getElementById('edit-brand').value.trim();
    item.color = document.getElementById('edit-color').value.trim();
    item.category = document.getElementById('edit-category').value;
    item.storageLocation = document.getElementById('edit-storage').value.trim() || item.storageLocation;
    item.description = document.getElementById('edit-desc').value.trim();

    this.saveInventory();
    this.closeEditModal();
    this.renderStaffDashboard();
    this.renderInventory();
    this.logActivity('STAFF', `Edited attributes for ${item.name} [${item.itemId}]`);
    alert(`Item "${item.name}" updated successfully.`);
  }

  updateLocation(itemId, loc) {
    if (!this.currentUser || !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can update storage locations.");
      return;
    }
    this.currentUser.assignStorageLocation(itemId, loc, this.inventory);
    this.saveInventory();
    this.logActivity('STAFF', `Updated location for ${itemId} to ${loc}`);
  }

  verifyProof(itemId, isApproved) {
    if (!this.currentUser || !(this.currentUser instanceof StaffUser)) {
      alert("Access Denied: Only authorized Campus Security Staff can accept or reject claim requests.");
      return;
    }

    const item = this.inventory.find(i => i.itemId === itemId);
    if (!item) return;

    if (isApproved) {
      if (!item.claimDetails) {
        alert("Cannot approve: No claim has been submitted for this item. A claimant must first submit a claim before staff can release the item.");
        return;
      }
      if (confirm(`Approve claim for ${item.name} to ${item.claimDetails.claimantName}?`)) {
        this.currentUser.verifyClaimantProof(itemId, true, `Verified by Staff ${this.currentUser.fullName} (Badge: ${this.currentUser.staffBadgeId})`, this.inventory);
        this.logActivity('STAFF', `Approved claim for ${item.name} [${item.itemId}]`);
      }
    } else {
      const reason = prompt("Enter rejection reason:", "Proof details did not match");
      if (reason) {
        this.currentUser.verifyClaimantProof(itemId, false, reason, this.inventory);
        this.logActivity('STAFF', `Rejected claim for ${item.name}. Reason: ${reason}`);
      }
    }

    this.saveInventory();
    this.renderStaffDashboard();
    this.renderInventory();
  }

  openClaimModal(itemId) {
    const item = this.inventory.find(i => i.itemId === itemId);
    if (!item) return;

    document.getElementById('claim-item-id').value = itemId;
    document.getElementById('claim-user-name').value = this.currentUser ? this.currentUser.fullName : 'Fares Farghaly';
    document.getElementById('claim-user-id').value = this.currentUser ? this.currentUser.userId : '1092169';
    document.getElementById('claim-user-phone').value = this.currentUser ? this.currentUser.contactNumber : '0568011077';
    document.getElementById('claim-proof-details').value = '';

    const summary = document.getElementById('claim-item-summary');
    if (summary) {
      summary.innerHTML = `
        <img src="${item.photos[0]}" class="w-10 h-10 rounded object-cover border border-slate-200">
        <div>
          <h4 class="font-bold text-slate-900 text-xs">${item.name}</h4>
          <p class="text-[10px] text-slate-500">${item.brand || 'Unbranded'} | ${item.storageLocation}</p>
        </div>
      `;
    }

    document.getElementById('claim-modal')?.classList.remove('hidden');
  }

  closeClaimModal() {
    document.getElementById('claim-modal')?.classList.add('hidden');
  }

  submitClaim(event) {
    event.preventDefault();
    const itemId = document.getElementById('claim-item-id').value;
    const proof = document.getElementById('claim-proof-details').value;

    const claimant = (this.currentUser instanceof NormalUser) ? this.currentUser : this.accounts.student;
    const result = claimant.claimItem(itemId, proof, this.inventory);

    if (result.success) {
      this.saveInventory();
      this.closeClaimModal();
      alert(`Claim submitted for "${result.item.name}". Main Campus Security will review your ownership proof.`);
      this.logActivity('CLAIMANT', `Submitted claim for ${result.item.name} [${result.item.itemId}]`);
      this.renderInventory();
      this.renderStaffDashboard();
    } else {
      alert(`Error: ${result.message}`);
    }
  }

  logActivity(source, msg) {
    const t = document.getElementById('ai-logs-terminal');
    if (!t) return;
    const time = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.innerHTML = `<span class="text-slate-500">[${time}]</span> <strong class="text-slate-300">[${source}]</strong> ${msg}`;
    t.appendChild(line);
    t.scrollTop = t.scrollHeight;
  }

  clearLogs() {
    const t = document.getElementById('ai-logs-terminal');
    if (t) t.innerHTML = '<div class="text-slate-500 font-mono text-[11px]">Logs cleared.</div>';
  }
}

let app;
window.addEventListener('DOMContentLoaded', () => {
  app = new FindAIApp();
});
