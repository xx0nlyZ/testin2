(function () {
    'use strict';

    var STORAGE_KEY = 'cec-announcements';
    var DELETED_KEY = 'cec-announcements-deleted';
    var LEGACY_STORAGE_KEY = 'cec-registrar-announcements';
    var LEGACY_DELETED_KEY = 'cec-registrar-announcements-deleted';

    var ORIGINS = {
        REGISTRAR: 'registrar',
        ADMIN: 'admin',
        FACULTY: 'faculty'
    };

    var CANONICAL_TO_ADMIN_AUDIENCE = {
        'Faculty & Students': 'All Users',
        'Students': 'Students',
        'Faculty': 'Faculty',
        'Registrar': 'Registrar'
    };

    var ADMIN_STATUS_TO_SHARED = { Live: 'Active', Scheduled: 'Scheduled', Expired: 'Archived' };
    var SHARED_TO_ADMIN_STATUS = { Active: 'Live', Scheduled: 'Scheduled', Archived: 'Expired' };

    function canonicalAudience(raw) {
        var list = Array.isArray(raw) ? raw : [raw];
        var known = { 'All Users': 1, 'Students': 1, 'Faculty': 1, 'Staff': 1, 'Registrar': 1 };
        var hasBroad = false;
        var hasStudents = false;
        var hasFaculty = false;
        var hasRegistrar = false;

        list.forEach(function (value) {
            if (value === 'All Users' || value === 'Specific Departments') {
                hasBroad = true;
            } else if (value === 'Students') {
                hasStudents = true;
            } else if (value === 'Faculty' || value === 'Staff') {
                hasFaculty = true;
            } else if (value === 'Registrar') {
                hasRegistrar = true;
            } else if (!known[value]) {
                hasBroad = true;
            }
        });

        if (hasBroad || (hasStudents && hasFaculty)) { return 'Faculty & Students'; }
        if (hasStudents) { return 'Students'; }
        if (hasFaculty) { return 'Faculty'; }
        if (hasRegistrar) { return 'Registrar'; }
        return 'Students';
    }

    var SEED = [
        {
            id: 'ann-seed-1',
            title: 'Enrollment for 2nd Semester Now Open',
            message: 'Enrollment for the 2nd Semester is now open. Please settle your accounts and coordinate with your advisers before the deadline.',
            audience: 'Students',
            priority: 'High',
            category: 'Enrollment',
            date: '2026-10-12T09:30:00',
            status: 'Active',
            author: "Registrar's Office",
            origin: 'registrar'
        },
        {
            id: 'ann-seed-2',
            title: 'Submission of Final Grades',
            message: 'Faculty members are reminded to submit their final grades through the portal on or before the posted deadline.',
            audience: 'Faculty',
            priority: 'Normal',
            category: 'Academic',
            date: '2026-10-10T14:00:00',
            status: 'Active',
            author: "Registrar's Office",
            origin: 'registrar'
        },
        {
            id: 'ann-seed-3',
            title: 'Document Request Processing Schedule',
            message: 'Document requests filed after 4:00 PM will be processed on the next working day. Please plan your requests accordingly.',
            audience: 'Faculty & Students',
            priority: 'Low',
            category: 'Schedule',
            date: '2026-10-08T11:15:00',
            status: 'Active',
            author: "Registrar's Office",
            origin: 'registrar'
        },
        {
            id: 'ann-seed-4',
            title: 'Registrar Office Closed on Holiday',
            message: 'The Registrar Office will be closed on the scheduled holiday. Online services remain available.',
            audience: 'Faculty & Students',
            priority: 'Normal',
            category: 'Event',
            date: '2026-10-05T08:00:00',
            status: 'Active',
            author: "Registrar's Office",
            origin: 'registrar'
        },
        {
            id: 'ann-seed-5',
            title: 'Midterm Examination Schedule Released',
            message: 'The midterm examination schedule for BSIT-1A is now posted. Please review your room assignments before exam week.',
            audience: 'Students',
            priority: 'High',
            category: 'Academic',
            date: '2026-10-11T10:00:00',
            status: 'Active',
            author: 'Mr. Charles Bacus',
            origin: 'faculty'
        },
        {
            id: 'ann-seed-6',
            title: 'Class Adviser Consultation Hours',
            message: 'Consultation hours are every Tuesday and Thursday, 1:00 PM to 3:00 PM. Book a slot through the portal.',
            audience: 'Students',
            priority: 'Normal',
            category: 'Academic',
            date: '2026-10-09T09:00:00',
            status: 'Active',
            author: 'Mr. Charles Bacus',
            origin: 'faculty'
        },
        {
            id: 'ann-seed-7',
            title: 'Faculty Assembly Reminder',
            message: 'All faculty members are required to attend the general assembly at the CEC gymnasium.',
            audience: 'Faculty',
            priority: 'Normal',
            category: 'Event',
            date: '2026-10-07T15:00:00',
            status: 'Active',
            author: "Registrar's Office",
            origin: 'registrar'
        },
        {
            id: 'ANN-1001',
            title: 'Semestral Break Schedule Announced',
            message: 'Classes will pause from June 15 to June 22 for the semestral break.',
            audience: 'Faculty & Students',
            priority: 'Normal',
            category: 'General',
            date: '2026-10-06T10:30:00',
            status: 'Active',
            author: 'Elena Cruz',
            origin: 'admin'
        },
        {
            id: 'ANN-1003',
            title: 'New Student Portal Features',
            message: 'A new grade viewer and scheduling tool is rolling out this week.',
            audience: 'Students',
            priority: 'Normal',
            category: 'General',
            date: '2026-10-04T10:30:00',
            status: 'Scheduled',
            author: 'Elena Cruz',
            origin: 'admin'
        },
        {
            id: 'ANN-1006',
            title: 'Library Hours Extension',
            message: 'The library will remain open until 9 PM during exam week.',
            audience: 'Faculty & Students',
            priority: 'Normal',
            category: 'General',
            date: '2026-10-01T10:30:00',
            status: 'Archived',
            author: 'Elena Cruz',
            origin: 'admin'
        }
    ];

    function readList(key) {
        try {
            var raw = localStorage.getItem(key);
            var parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            return [];
        }
    }

    function writeList(key, list) {
        try {
            localStorage.setItem(key, JSON.stringify(list));
        } catch (err) {
            /* storage unavailable — ignore for prototype */
        }
    }

    function migrateLegacy() {
        try {
            if (localStorage.getItem(STORAGE_KEY) === null) {
                var legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
                if (legacy) { localStorage.setItem(STORAGE_KEY, legacy); }
            }
            if (localStorage.getItem(DELETED_KEY) === null) {
                var legacyDeleted = localStorage.getItem(LEGACY_DELETED_KEY);
                if (legacyDeleted) { localStorage.setItem(DELETED_KEY, legacyDeleted); }
            }
        } catch (err) {
            /* ignore */
        }
    }

    function readStored() {
        return readList(STORAGE_KEY);
    }

    function readDeleted() {
        return readList(DELETED_KEY);
    }

    function all() {
        var deleted = readDeleted();
        var map = {};

        SEED.forEach(function (item) { map[item.id] = item; });
        readStored().forEach(function (item) { map[item.id] = item; });

        return Object.keys(map)
            .map(function (id) { return map[id]; })
            .filter(function (item) { return deleted.indexOf(item.id) === -1; })
            .sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    }

    function matchesRole(audience, role) {
        if (role === 'faculty') {
            return audience === 'Faculty' || audience === 'Faculty & Students';
        }
        if (role === 'student') {
            return audience === 'Students' || audience === 'Faculty & Students';
        }
        return true;
    }

    function forRole(role) {
        return all().filter(function (item) {
            return matchesRole(item.audience, role);
        });
    }

    function isOwner(item, role) {
        if (!item) { return false; }
        if (item.origin) { return item.origin === role; }
        if (role === ORIGINS.REGISTRAR) { return item.author === "Registrar's Office"; }
        if (role === ORIGINS.FACULTY) { return item.author === 'Mr. Charles Bacus'; }
        return false;
    }

    function find(id) {
        if (!id) { return null; }
        var items = all();
        for (var i = 0; i < items.length; i++) {
            if (items[i].id === id) { return items[i]; }
        }
        return null;
    }

    function upsert(record) {
        var stored = readStored();
        var replaced = false;

        for (var i = 0; i < stored.length; i++) {
            if (stored[i].id === record.id) {
                stored[i] = record;
                replaced = true;
                break;
            }
        }
        if (!replaced) { stored.unshift(record); }
        writeList(STORAGE_KEY, stored);

        var deleted = readDeleted();
        var idx = deleted.indexOf(record.id);
        if (idx !== -1) {
            deleted.splice(idx, 1);
            writeList(DELETED_KEY, deleted);
        }
        return record;
    }

    function remove(id) {
        var stored = readStored().filter(function (item) { return item.id !== id; });
        writeList(STORAGE_KEY, stored);

        var deleted = readDeleted();
        if (deleted.indexOf(id) === -1) {
            deleted.push(id);
            writeList(DELETED_KEY, deleted);
        }
    }

    migrateLegacy();

    window.AnnouncementStore = {
        STORAGE_KEY: STORAGE_KEY,
        DELETED_KEY: DELETED_KEY,
        seed: SEED,
        ORIGINS: ORIGINS,
        CANONICAL_TO_ADMIN_AUDIENCE: CANONICAL_TO_ADMIN_AUDIENCE,
        ADMIN_STATUS_TO_SHARED: ADMIN_STATUS_TO_SHARED,
        SHARED_TO_ADMIN_STATUS: SHARED_TO_ADMIN_STATUS,
        canonicalAudience: canonicalAudience,
        readStored: readStored,
        all: all,
        forRole: forRole,
        matchesRole: matchesRole,
        isOwner: isOwner,
        find: find,
        upsert: upsert,
        remove: remove
    };
})();
